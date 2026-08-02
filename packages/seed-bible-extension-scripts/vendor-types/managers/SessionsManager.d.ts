import { type ReadonlySignal } from "@preact/signals";
import { type BibleReadingState } from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";
import type { BibleReadingExtensionManager } from "../managers/BibleReadingExtensionManager";
import type { BibleDataManager } from "../managers/BibleDataManager";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import type { CasualOSManager } from "./OsManager";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import type { I18nManager } from "../i18n/I18nManager";
export interface ConnectionSessionUserVisual {
  defaultIcon: string;
  color: string;
  colorName: string;
}
export interface ConnectedSessionUser extends SessionConnectionInfo {
  /**
   * The user's profile information. Null if the user is not logged in or if the profile information could not be loaded.
   */
  profile: UserProfile | null;
  /** The visual representation of the user, including icon and color. */
  visual: ConnectionSessionUserVisual;
  /**
   * Whether this user is currently connected to the session.
   */
  isActive: boolean;
  /**
   * The `Date.now()` timestamp when this user first broadcast their profile
   * into the session, i.e. when they joined. Null if the user has not
   * broadcast a join time (e.g. legacy entries written before this existed).
   */
  joinedAtMs: number | null;
}
export interface SessionConnectionInfo {
  /**
   * The ID of the user in the session connection.
   */
  userId: string | null;
  /**
   * The ID of the connection.
   */
  connectionId: string;
  /**
   * Whether this event is for the current client.
   * This will be true when `client.connectionId` is the same as the `configBot.id` and false otherwise.
   */
  isSelf: boolean;
}
export interface SessionOptions {
  allowedNavigators: string[] | null;
  allowedDecorators: string[] | null;
  /**
   * The user id (or connection id for anonymous hosts) of the session
   * creator. Set once at creation and never changes; used by the session
   * settings UI to show host-only controls to the right user.
   */
  hostUserId: string | null;
  /**
   * How long a navigation highlight from another user should stay visible
   * locally, in seconds. `null` means "forever until dismissed". Matches
   * develop's "Highlight For" picker (8 / 16 / 20 / ∞).
   */
  highlightDurationSeconds: number | null;
  /**
   * Epoch ms when the host ended the session. Non-null signals participants
   * to close their tabs. Set via `updateOptions` before the host disposes
   * so the CRDT update propagates to other clients.
   */
  endedAt: number | null;
  /**
   * Whether the reading translation is shared across the session. When
   * `false` (the default) each participant keeps their own translation and
   * only book/chapter/scroll navigation is synced — changing your
   * translation never affects other participants. When `true`, translation
   * changes propagate to everyone.
   */
  shareTranslation: boolean;
  /**
   * Additional user ids (or connection ids) that share the host's powers:
   * they can change session settings and always navigate/decorate even when
   * those actions are host-restricted. Used by the "appoint a co-host" flow
   * so a leaving host can hand the session off instead of ending it.
   */
  coHostUserIds: string[];
}
/**
 * True when `sessionId` (a userId or connectionId) is the host or a co-host
 * of the session described by `options`.
 */
export declare function isSessionHost(
  options: SessionOptions,
  sessionId: string | null
): boolean;
/**
 * Pure-hash user visual. Same input → same output, forever. The icon and
 * color are derived independently from the hash so small changes to the
 * key (e.g. user id suffix) distribute across the whole palette.
 */
export declare function getUserAnimalVisual(
  key: string
): ConnectionSessionUserVisual;
/**
 * Given a `ConnectedSessionUser`, returns the SAME key that the sidebar
 * self-avatar would use for this same person on their own client. This
 * guarantees visual consistency between "how I see myself in the sidebar"
 * and "how others see me in the connected users row".
 */
export declare function getConnectedUserVisualKey(user: {
  userId?: string | null;
  connectionId?: string | null;
}): string;
export interface BibleReadingSession {
  id: string;
  document: SharedDocument;
  options: ReadonlySignal<SessionOptions>;
  updateOptions: (newOptions: Partial<SessionOptions>) => void;
  readingState: BibleReadingState;
  allUsers: ReadonlySignal<ConnectedSessionUser[]>;
  connectedUsers: ReadonlySignal<ConnectedSessionUser[]>;
  currentUser: ReadonlySignal<ConnectedSessionUser | null>;
  /**
   * Whether the given user is the session host, based on the session's current options.
   * @param user The user to check.
   */
  isHost(user: ConnectedSessionUser | null): boolean;
  /**
   * Removes a decoration by id from the session's shared CRDT map. Use
   * this instead of `readingState.removeDecoration` when you need the
   * removal to propagate globally — otherwise the sync effect re-seeds
   * the decoration from the still-present map entry and the removal is
   * undone locally.
   */
  removeSharedDecoration: (decorationId: string) => void;
  dispose: () => void;
  localSessionId: ReadonlySignal<string>;
  /**
   * Returns true if the given session ID (userId or connectionId) is
   * permitted to navigate in this session. When `allowedNavigators` is
   * null or empty every participant may navigate.
   */
  userCanNavigate: (sessionId: string) => boolean;
  /**
   * Returns true if the given session ID (userId or connectionId) is
   * permitted to add decorations in this session. When `allowedDecorators`
   * is null or empty every participant may decorate.
   */
  userCanDecorate: (sessionId: string) => boolean;
}
export interface SessionsManager {
  createSession: () => Promise<BibleReadingSession>;
  joinSession: (id: string) => Promise<BibleReadingSession>;
}
export declare function createSessionsManager(
  os: CasualOSManager,
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  readingExtensionManager?: BibleReadingExtensionManager
): SessionsManager;
