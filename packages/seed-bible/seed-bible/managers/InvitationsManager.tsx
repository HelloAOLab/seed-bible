import { effect, signal, type Signal } from "@preact/signals";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
import type { CasualOSManager } from "./OsManager";
import type { FollowsManager } from "./FollowsManager";
import type {
  SharedDocument,
  SharedMap,
} from "@casual-simulation/aux-common/documents/SharedDocument";

/**
 * A live shared session published by another user that the current user
 * can join. Populated from the global shared-sessions registry.
 */
export interface AvailableSharedSession {
  sessionId: string;
  hostUserId: string;
  hostProfile: UserProfile | null;
  publishedAt: number;
}

/** Raw registry entry stored in the global CRDT document. */
interface StoredRegistryEntry {
  sessionId: string;
  hostUserId: string;
  /**
   * CasualOS connection id of the client that published the entry. When the
   * host's browser disconnects, that connection id drops from the registry
   * doc's `remoteClients` list — we use that signal to hide stale entries
   * left behind by hosts who closed without an explicit unpublish (or whose
   * entry survived from a previous run of the app).
   */
  hostConnectionId: string | null;
  publishedAt: number;
}

export interface InvitationsManager {
  /**
   * Shared sessions currently published by people the user follows.
   * When someone they follow creates a shared tab, it auto-appears here.
   */
  availableSessions: Signal<AvailableSharedSession[]>;
  /** Publish a newly-created shared session into the global registry. */
  publishSession: (session: BibleReadingSession) => Promise<void>;
  /** Remove a previously-published session from the registry. */
  unpublishSession: (sessionId: string) => Promise<void>;
  /** Join a session that was discovered via the registry. */
  joinAvailableSession: (entry: AvailableSharedSession) => Promise<void>;
  /**
   * Hide a registry entry for this client only (doesn't remove from the
   * registry — other users still see it; this client just stops showing it).
   */
  dismissAvailableSession: (entry: AvailableSharedSession) => void;
  /** Release resources (close subscriptions, etc). */
  dispose: () => void;
}

/** Callback that joins a session by id and returns the created tab/session. */
export type OnJoinSharedSession = (
  sessionId: string
) => Promise<unknown> | unknown;

const REGISTRY_DOC_ID = "shared-sessions-registry";
const REGISTRY_DOC_DATA = "registry";
const REGISTRY_MAP_NAME = "sessions";

function parseStoredEntry(value: unknown): StoredRegistryEntry | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.sessionId !== "string" ||
    typeof obj.hostUserId !== "string" ||
    typeof obj.publishedAt !== "number"
  ) {
    return null;
  }
  return {
    sessionId: obj.sessionId,
    hostUserId: obj.hostUserId,
    hostConnectionId:
      typeof obj.hostConnectionId === "string" ? obj.hostConnectionId : null,
    publishedAt: obj.publishedAt,
  };
}

/**
 * Creates the shared-sessions registry manager.
 *
 * Architecture:
 * - A single CRDT shared document `shared-sessions-registry` is opened by
 *   every logged-in client. Its `sessions` map holds `{ sessionId, hostUserId,
 *   publishedAt }` entries keyed by session id.
 * - When a user creates a shared session, `publishSession()` writes an entry;
 *   clients that follow them see it live and can click to join.
 * - `unpublishSession()` removes the entry (typically called when the session
 *   tab is closed / disposed).
 *
 * This replaces an explicit invite-and-accept flow: publishing IS the invite,
 * and joining IS the acceptance.
 *
 * **The registry document is global** — every client writes to and reads from
 * the same doc, so an entry is visible to everyone. What the follow list
 * controls is which entries this client will *surface*: `applyEntries` keeps
 * only sessions hosted by someone the user follows. Without that filter this
 * manager would notify every user about every session in the app, which is why
 * it was previously disabled.
 *
 * The registry is only opened (a live WebSocket) once the user is signed in
 * and follows at least one account — with no follows, every entry would be
 * filtered out anyway, so there's nothing to gain from connecting.
 */
export function createInvitationsManager(
  os: CasualOSManager,
  login: LoginManager,
  follows: FollowsManager,
  onJoin: OnJoinSharedSession,
  options?: {
    /**
     * When false, the registry document is never opened and no sessions are
     * ever surfaced. Lets the feature be switched off independently of the
     * follow list, since opening the registry costs a shared document on every
     * client.
     */
    enabled?: () => boolean;
  }
): InvitationsManager {
  const availableSessions = signal<AvailableSharedSession[]>([]);
  const profileCache = new Map<string, UserProfile | null>();
  const locallyDismissed = new Set<string>();

  let registryDoc: SharedDocument | null = null;
  let registryMap: SharedMap<StoredRegistryEntry> | null = null;
  let changesSubscription: { unsubscribe: () => void } | null = null;
  let remoteClientsSubscription: { unsubscribe: () => void } | null = null;
  let profileRefreshVersion = 0;
  let disposed = false;
  // Connection ids that are currently connected to the registry document.
  // An entry whose `hostConnectionId` is not in this set is considered
  // stale (the host's browser closed without a clean unpublish) and is
  // hidden from the UI.
  const liveConnectionIds = new Set<string>();

  const isEnabled = () => options?.enabled?.() ?? true;

  const readStoredEntries = (): StoredRegistryEntry[] => {
    if (!registryMap) return [];
    const list: StoredRegistryEntry[] = [];
    registryMap.forEach((value) => {
      const parsed = parseStoredEntry(value);
      if (parsed) list.push(parsed);
    });
    return list;
  };

  const applyEntries = (entries: StoredRegistryEntry[]) => {
    const currentUserId = login.userId.value;
    const currentConnectionId = os.connectionId;
    const followedIds = new Set(follows.followingIds.value);

    const filtered = entries.filter(
      (entry) =>
        // Hide own sessions — hosts don't see themselves in the list.
        // For logged-out users the host identity is the connection id,
        // which is what we compare against.
        entry.hostUserId !== currentUserId &&
        entry.hostUserId !== currentConnectionId &&
        // The registry is global, so this is what keeps it from broadcasting
        // every session in the app to every user.
        followedIds.has(entry.hostUserId) &&
        !locallyDismissed.has(entry.sessionId) &&
        // Only show entries whose host is currently connected. This means
        // notifications only fire when a user is actually live in their
        // shared session — no stale rows left over from previous runs.
        entry.hostConnectionId !== null &&
        liveConnectionIds.has(entry.hostConnectionId)
    );
    filtered.sort((a, b) => b.publishedAt - a.publishedAt);
    availableSessions.value = filtered.map((entry) => ({
      sessionId: entry.sessionId,
      hostUserId: entry.hostUserId,
      hostProfile: profileCache.get(entry.hostUserId) ?? null,
      publishedAt: entry.publishedAt,
    }));
  };

  const refreshProfiles = async (entries: StoredRegistryEntry[]) => {
    const version = ++profileRefreshVersion;
    // Only the hosts that survive the follow filter are worth a profile
    // request — the rest are never rendered.
    const followedIds = new Set(follows.followingIds.peek());
    const uniqueIds = Array.from(
      new Set(
        entries
          .map((entry) => entry.hostUserId)
          .filter((id) => followedIds.has(id))
      )
    );

    await Promise.all(
      uniqueIds.map(async (userId) => {
        if (profileCache.has(userId)) return;
        try {
          const profile = await login.getUserProfile(userId);
          profileCache.set(userId, profile ?? null);
        } catch {
          profileCache.set(userId, null);
        }
      })
    );

    if (version !== profileRefreshVersion || disposed) return;
    applyEntries(entries);
  };

  const syncFromRegistry = () => {
    const entries = readStoredEntries();
    applyEntries(entries);
    void refreshProfiles(entries);
  };

  const openRegistry = async () => {
    if (registryDoc || disposed || !isEnabled()) return;
    try {
      const document = await os.getSharedDocument(
        null,
        REGISTRY_DOC_ID,
        REGISTRY_DOC_DATA
      );
      // `dispose` may have run while the document was connecting.
      if (disposed) {
        document.unsubscribe?.();
        return;
      }
      registryDoc = document;
      registryMap = document.getMap<StoredRegistryEntry>(REGISTRY_MAP_NAME);
      // Seed our own connection id so entries we publish during this run
      // immediately pass the "is host connected" filter on other clients
      // after both clients open the registry.
      const localId = os.connectionId;
      if (localId) liveConnectionIds.add(localId);
      changesSubscription = registryMap.changes.subscribe(() => {
        syncFromRegistry();
      });
      // Track connect/disconnect events on the registry document so the
      // filter in `applyEntries` can drop entries belonging to
      // hosts who aren't here anymore.
      remoteClientsSubscription = document.remoteClients.subscribe(
        (event: { type: string; client: { connectionId: string } }) => {
          if (event.type === "client_connected") {
            liveConnectionIds.add(event.client.connectionId);
          } else {
            liveConnectionIds.delete(event.client.connectionId);
          }
          if (registryMap) {
            applyEntries(readStoredEntries());
          }
        }
      );
      syncFromRegistry();
    } catch (error) {
      console.error(
        "[InvitationsManager] Failed to open shared-sessions registry:",
        error
      );
    }
  };

  // Re-filter when the signed-in account or the follow list changes, so
  // following someone who is already hosting surfaces their session right away
  // (and unfollowing hides it) without waiting for the next registry change.
  //
  // This is also what opens the registry document in the first place — but
  // only once the user is signed in AND follows at least one account. With no
  // follows, `applyEntries` would filter every entry out anyway, so there is
  // nothing to gain from connecting; every signed-out/no-follows case (which
  // includes most tests and most anonymous visits) never opens a live
  // WebSocket at all. Opening is one-way: once connected, it stays connected
  // rather than disconnecting again if the follow list empties out.
  const stopAuthEffect = effect(() => {
    const userId = login.userId.value;
    const hasFollows = follows.following.value.length > 0;
    if (registryMap) {
      applyEntries(readStoredEntries());
    } else if (
      typeof window !== "undefined" &&
      userId &&
      hasFollows &&
      isEnabled()
    ) {
      void openRegistry();
    }
  });

  const publishSession = async (
    session: BibleReadingSession
  ): Promise<void> => {
    await openRegistry();
    if (!registryDoc || !registryMap) return;
    // Fall back to the connection id when the user isn't logged in so
    // anonymous hosts still publish and other clients can discover them.
    const hostConnectionId = os.connectionId;
    const hostUserId = login.userId.value ?? hostConnectionId;
    if (!hostUserId) return;
    const entry: StoredRegistryEntry = {
      sessionId: session.id,
      hostUserId,
      hostConnectionId,
      publishedAt: Date.now(),
    };
    const docRef = registryDoc;
    const mapRef = registryMap;
    docRef.transact(() => {
      mapRef.set(entry.sessionId, entry);
    });
  };

  const unpublishSession = async (sessionId: string): Promise<void> => {
    if (!registryDoc || !registryMap) return;
    const docRef = registryDoc;
    const mapRef = registryMap;
    docRef.transact(() => {
      mapRef.delete(sessionId);
    });
  };

  const joinAvailableSession = async (
    entry: AvailableSharedSession
  ): Promise<void> => {
    await Promise.resolve(onJoin(entry.sessionId));
  };

  const dismissAvailableSession = (entry: AvailableSharedSession) => {
    locallyDismissed.add(entry.sessionId);
    if (registryMap) {
      applyEntries(readStoredEntries());
    }
  };

  const dispose = () => {
    disposed = true;
    stopAuthEffect();
    changesSubscription?.unsubscribe();
    changesSubscription = null;
    remoteClientsSubscription?.unsubscribe();
    remoteClientsSubscription = null;
    liveConnectionIds.clear();
    registryDoc?.unsubscribe?.();
    registryDoc = null;
    registryMap = null;
  };

  return {
    availableSessions,
    publishSession,
    unpublishSession,
    joinAvailableSession,
    dismissAvailableSession,
    dispose,
  };
}
