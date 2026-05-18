import { effect, signal, type Signal } from "@preact/signals";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
import type {
  SharedDocument,
  SharedMap,
} from "@casual-simulation/aux-common/documents/SharedDocument";
import type { CasualOSManager } from "./OsManager";

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
   * Shared sessions currently published by OTHER logged-in users.
   * When someone creates a shared tab, it auto-appears here for others.
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
 *   all other connected clients see it live and can click to join.
 * - `unpublishSession()` removes the entry (typically called when the session
 *   tab is closed / disposed).
 *
 * This replaces an explicit invite-and-accept flow: publishing IS the invite,
 * and joining IS the acceptance. Every client filters out their OWN sessions
 * from the list so hosts don't see their own published sessions.
 */
export function createInvitationsManager(
  os: CasualOSManager,
  login: LoginManager,
  onJoin: OnJoinSharedSession
): InvitationsManager {
  const availableSessions = signal<AvailableSharedSession[]>([]);
  const profileCache = new Map<string, UserProfile | null>();
  const locallyDismissed = new Set<string>();

  let registryDoc: SharedDocument | null = null;
  let registryMap: SharedMap<StoredRegistryEntry> | null = null;
  let changesSubscription: { unsubscribe: () => void } | null = null;
  let remoteClientsSubscription: { unsubscribe: () => void } | null = null;
  let profileRefreshVersion = 0;
  // Connection ids that are currently connected to the registry document.
  // An entry whose `hostConnectionId` is not in this set is considered
  // stale (the host's browser closed without a clean unpublish) and is
  // hidden from the UI.
  const liveConnectionIds = new Set<string>();

  const readStoredEntries = (): StoredRegistryEntry[] => {
    if (!registryMap) return [];
    const list: StoredRegistryEntry[] = [];
    registryMap.forEach((value) => {
      const parsed = parseStoredEntry(value);
      if (parsed) list.push(parsed);
    });
    return list;
  };

  const applyEntriesWithProfiles = (entries: StoredRegistryEntry[]) => {
    const currentUserId = login.userId.value;
    const currentConnectionId = os.connectionId;
    const filtered = entries.filter(
      (entry) =>
        // Hide own sessions — hosts don't see themselves in the list.
        // For logged-out users the host identity is the connection id,
        // which is what we compare against.
        entry.hostUserId !== currentUserId &&
        entry.hostUserId !== currentConnectionId &&
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
    const uniqueIds = Array.from(
      new Set(entries.map((entry) => entry.hostUserId))
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

    if (version !== profileRefreshVersion) return;
    applyEntriesWithProfiles(entries);
  };

  const syncFromRegistry = () => {
    const entries = readStoredEntries();
    applyEntriesWithProfiles(entries);
    void refreshProfiles(entries);
  };

  const openRegistry = async () => {
    if (registryDoc) return;
    try {
      const document = await os.getSharedDocument(
        null,
        REGISTRY_DOC_ID,
        REGISTRY_DOC_DATA
      );
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
      // filter in `applyEntriesWithProfiles` can drop entries belonging to
      // hosts who aren't here anymore.
      remoteClientsSubscription = document.remoteClients.subscribe(
        (event: { type: string; client: { connectionId: string } }) => {
          if (event.type === "client_connected") {
            liveConnectionIds.add(event.client.connectionId);
          } else {
            liveConnectionIds.delete(event.client.connectionId);
          }
          if (registryMap) {
            applyEntriesWithProfiles(readStoredEntries());
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

  // Refresh the visible list when the current user id changes (so own
  // sessions get hidden appropriately and cached profiles re-apply).
  const stopAuthEffect = effect(() => {
    // Access userId so this effect re-runs on login/logout
    void login.userId.value;
    if (registryMap) {
      applyEntriesWithProfiles(readStoredEntries());
    }
  });

  // Kick off the registry connection immediately — discoverability doesn't
  // require the current user to be logged in.

  // TODO: Support invitations
  // void openRegistry();

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
      applyEntriesWithProfiles(readStoredEntries());
    }
  };

  const dispose = () => {
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
