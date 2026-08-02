import { type Signal } from "@preact/signals";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
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
/**
 * Returns a stable local identifier for this client. Prefers the CasualOS
 * connection id (which is what `SessionsManager` uses to identify a
 * connected user anyway), falling back to a sentinel so comparisons work.
 */
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
export declare function createInvitationsManager(
  os: CasualOSManager,
  login: LoginManager,
  onJoin: OnJoinSharedSession
): InvitationsManager;
