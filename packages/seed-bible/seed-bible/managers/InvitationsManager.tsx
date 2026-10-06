import { effect, signal, type Signal } from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
import type { CasualOSManager } from "./OsManager";
import type { FriendProfile, FriendsManager } from "./FriendsManager";
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
  /**
   * The host's name and picture, as the friends list has them. Null while
   * their profile is still loading there.
   */
  hostProfile: FriendProfile | null;
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
   * Shared sessions currently published by the user's friends.
   * When a friend creates a shared tab, it auto-appears here.
   */
  availableSessions: Signal<AvailableSharedSession[]>;
  /**
   * Publish a newly-created shared session into the global registry. It's
   * only listed while the host is signed in with at least one friend: until
   * then it waits, and it comes off the list whenever that stops being true.
   */
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
 *   their friends see it live and can click to join.
 * - `unpublishSession()` removes the entry (typically called when the session
 *   tab is closed / disposed).
 *
 * This replaces an explicit invite-and-accept flow: publishing IS the invite,
 * and joining IS the acceptance.
 *
 * **The registry document is global** — every client writes to and reads from
 * the same doc, so an entry is visible to everyone. What the friends list
 * controls is which entries this client will *surface*: `applyEntries` keeps
 * only sessions hosted by a friend. Without that filter this
 * manager would notify every user about every session in the app, which is why
 * it was previously disabled.
 *
 * The registry is only opened (a live WebSocket), and a session only
 * published, once the user is signed in and has at least one friend — with no
 * friends there's nobody to see their session and nothing to surface, so
 * there's nothing to gain from connecting.
 */
export function createInvitationsManager(
  os: CasualOSManager,
  login: LoginManager,
  friends: FriendsManager,
  onJoin: OnJoinSharedSession
): InvitationsManager {
  const availableSessions = signal<AvailableSharedSession[]>([]);
  const locallyDismissed = new Set<string>();

  let registryDoc: SharedDocument | null = null;
  let registryMap: SharedMap<StoredRegistryEntry> | null = null;
  let opening: Promise<void> | null = null;
  let changesSubscription: { unsubscribe: () => void } | null = null;
  let remoteClientsSubscription: { unsubscribe: () => void } | null = null;
  let disposed = false;
  // Connection ids that are currently connected to the registry document.
  // An entry whose `hostConnectionId` is not in this set is considered
  // stale (the host's browser closed without a clean unpublish) and is
  // hidden from the UI.
  const liveConnectionIds = new Set<string>();
  // Sessions this client hosts, each with the account it's listed under (null
  // until it is). One created before the friends list loads, or before the
  // first friend, waits here until it can be listed.
  const hostedSessions = new Map<string, string | null>();

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
    // Read here rather than fetched per host, so a host's name shows up as
    // soon as the friends list has their profile.
    const friendsById = new Map(
      friends.friends.value.map((friend) => [friend.userId, friend])
    );

    const filtered = entries.filter(
      (entry) =>
        // Hide own sessions — hosts don't see themselves in the list.
        // For logged-out users the host identity is the connection id,
        // which is what we compare against.
        entry.hostUserId !== currentUserId &&
        entry.hostUserId !== currentConnectionId &&
        // The registry is global, so this is what keeps it from broadcasting
        // every session in the app to every user.
        friendsById.has(entry.hostUserId) &&
        !locallyDismissed.has(entry.sessionId) &&
        // Only show entries whose host is currently connected. This means
        // notifications only fire when a user is actually live in their
        // shared session — no stale rows left over from previous runs.
        entry.hostConnectionId !== null &&
        liveConnectionIds.has(entry.hostConnectionId)
    );
    filtered.sort((a, b) => b.publishedAt - a.publishedAt);
    availableSessions.value = filtered.map((entry) => {
      const host = friendsById.get(entry.hostUserId);
      return {
        sessionId: entry.sessionId,
        hostUserId: entry.hostUserId,
        hostProfile: host
          ? { name: host.name, pictureUrl: host.pictureUrl }
          : null,
        publishedAt: entry.publishedAt,
      };
    });
  };

  const syncFromRegistry = () => {
    applyEntries(readStoredEntries());
  };

  const openRegistry = () => {
    if (registryDoc || disposed) return Promise.resolve();
    opening ??= connectRegistry().finally(() => {
      opening = null;
    });
    return opening;
  };

  const connectRegistry = async () => {
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

  const publishHostedSessions = async (): Promise<void> => {
    const userId = login.userId.peek();
    // Anyone can read the registry, so a session is only listed when its host
    // has a friend to see it; nobody else's would ever be shown.
    if (!userId || friends.friendIds.peek().length === 0) return;
    if ([...hostedSessions.values()].every((listedAs) => listedAs === userId)) {
      return;
    }
    await openRegistry();
    if (!registryDoc || !registryMap) return;
    // Signing out while the registry was connecting leaves no host to list.
    const hostUserId = login.userId.peek();
    if (!hostUserId) return;
    const mapRef = registryMap;
    registryDoc.transact(() => {
      for (const [sessionId, listedAs] of hostedSessions) {
        if (listedAs === hostUserId) continue;
        mapRef.set(sessionId, {
          sessionId,
          hostUserId,
          hostConnectionId: os.connectionId,
          publishedAt: Date.now(),
        });
        hostedSessions.set(sessionId, hostUserId);
      }
    });
  };

  // Takes this client's sessions off the registry while they can't be listed
  // (signed out, or no friends left), so friends aren't still invited into a
  // session whose host has gone. `publishHostedSessions` lists them again
  // once they can be.
  const unlistHostedSessions = () => {
    const listed = [...hostedSessions].filter(
      ([, listedAs]) => listedAs !== null
    );
    if (!registryDoc || !registryMap || listed.length === 0) return;
    const mapRef = registryMap;
    registryDoc.transact(() => {
      for (const [sessionId] of listed) {
        mapRef.delete(sessionId);
        hostedSessions.set(sessionId, null);
      }
    });
  };

  // Re-filter when the signed-in account or the friends list changes, so
  // becoming friends with someone who is already hosting surfaces their
  // session right away (and unfriending hides it) without waiting for the next
  // registry change. A friend's profile loading counts too, which is what
  // fills in a host's name.
  //
  // This is also what opens the registry document in the first place — but
  // only once the user is signed in AND has at least one friend. With no
  // friends, `applyEntries` would filter every entry out anyway, so there is
  // nothing to gain from connecting; every signed-out/no-friends case (which
  // includes most tests and most anonymous visits) never opens a live
  // WebSocket at all. Opening is one-way: once connected, it stays connected
  // rather than disconnecting again if the friends list empties out.
  const stopAuthEffect = effect(() => {
    const userId = login.userId.value;
    // The list with names, not just the IDs: a friend's profile loading
    // changes no ID, and is what fills in the name on their session.
    const hasFriends = friends.friends.value.length > 0;
    if (registryMap) {
      applyEntries(readStoredEntries());
    } else if (typeof window !== "undefined" && userId && hasFriends) {
      void openRegistry();
    }
    if (userId && hasFriends) {
      void publishHostedSessions();
    } else {
      unlistHostedSessions();
    }
  });

  const publishSession = async (
    session: BibleReadingSession
  ): Promise<void> => {
    if (!hostedSessions.has(session.id)) {
      hostedSessions.set(session.id, null);
    }
    await publishHostedSessions();
  };

  const unpublishSession = async (sessionId: string): Promise<void> => {
    hostedSessions.delete(sessionId);
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
