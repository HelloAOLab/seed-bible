import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import {
  createBibleReadingState,
  type BibleReadingState,
  type InitialBibleReadingOptions,
  type VerseDecoration,
  type VerseDecorationInput,
} from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";
import type { BibleReadingExtensionManager } from "../managers/BibleReadingExtensionManager";
import type { BibleDataManager } from "../managers/BibleDataManager";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import type { CasualOSManager } from "./OsManager";
import type {
  SharedDocument,
  SharedMap,
} from "@casual-simulation/aux-common/documents/SharedDocument";
import { v4 as uuid } from "uuid";
import type { I18nManager } from "../i18n/I18nManager";
import type { AnnotationsManager } from "./AnnotationsManager";

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

interface SessionData {
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number | null;
  scrollToVerse: number | null;
}

/**
 * Where a new session should begin reading.
 *
 * Seeded into the session's reading state at construction rather than
 * navigated to afterwards, so the reader never loads the default book first —
 * see `addTab`'s `initialReadingOptions` for the same reasoning.
 *
 * Chapter-level deliberately: a `scrollToVerse` seeded here does not survive
 * to the rendered session tab, which opens at the top of the chapter either
 * way, so it is left out rather than carried as a setting that does nothing.
 */
export type SessionStartPosition = Pick<
  InitialBibleReadingOptions,
  "initialTranslationId" | "initialBookId" | "initialChapterNumber"
>;

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
export function isSessionHost(
  options: SessionOptions,
  sessionId: string | null
): boolean {
  if (!sessionId) {
    return false;
  }
  return (
    options.hostUserId === sessionId ||
    (options.coHostUserIds ?? []).includes(sessionId)
  );
}

type SessionOptionValue = SessionOptions[keyof SessionOptions];
type SessionDecorationValue = VerseDecoration;

/**
 * The shape each enabled reading extension publishes into the session's
 * `reading_extensions` map, keyed by extension id: whether it is enabled plus
 * the extension's custom (JSON-serializable) data.
 */
interface SessionExtensionValue {
  enabled: boolean;
  data: unknown;
}

/** Structural equality for reading-extension data (JSON-serializable values). */
function extensionDataMatches(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

/**
 * The shape each client publishes into the session's `user_profiles` map
 * to broadcast their current identity. The connection's `userId` is
 * frozen on the wire at connect time and never re-emitted on login/logout,
 * so this map is how peers learn each other's *current* userId + profile
 * mid-session.
 */
interface SharedUserProfileEntry {
  userId: string | null;
  profile: UserProfile | null;
  /**
   * The `Date.now()` timestamp captured by the user the first time they
   * broadcast their profile into the session, i.e. when they joined.
   * Preserved across subsequent re-broadcasts. `null` for entries written
   * before this field existed.
   */
  joinedAtMs: number | null;
}

function parseSharedUserProfileEntry(
  value: unknown
): SharedUserProfileEntry | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const userId =
    typeof record.userId === "string" || record.userId === null
      ? (record.userId as string | null)
      : null;
  const rawProfile = record.profile;
  const profile =
    rawProfile && typeof rawProfile === "object"
      ? (rawProfile as UserProfile)
      : null;
  const joinedAtMs =
    typeof record.joinedAtMs === "number" && Number.isFinite(record.joinedAtMs)
      ? record.joinedAtMs
      : null;
  return { userId, profile, joinedAtMs };
}

function sharedUserProfileEntriesMatch(
  left: SharedUserProfileEntry,
  right: SharedUserProfileEntry
): boolean {
  return (
    left.userId === right.userId &&
    left.joinedAtMs === right.joinedAtMs &&
    JSON.stringify(left.profile) === JSON.stringify(right.profile)
  );
}

/**
 * Where one participant's own reader is, as published into the session's
 * `reading_positions` map.
 *
 * Broadcast per connection because `reading_state` holds a single position for
 * the whole session, which cannot answer "where is each participant": someone
 * outside `allowedNavigators` moves their own reader without ever publishing,
 * and everyone else trails a navigation by the publish debounce. Reading the
 * session position instead reports every peer wherever the *local* reader is.
 */
export interface ParticipantReadingPosition {
  bookId: string;
  chapterNumber: number;
}

function parseParticipantReadingPosition(
  value: unknown
): ParticipantReadingPosition | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const bookId = toStringOrNull(record.bookId);
  const chapterNumber = toPositiveIntOrNull(record.chapterNumber);
  if (!bookId || chapterNumber === null) return null;
  return { bookId, chapterNumber };
}

/**
 * How long to wait after a local navigation before publishing it to peers.
 *
 * Navigation is instant and unthrottled, so skimming ten chapters fires ten
 * position changes in about a second. Publishing each one would put ten
 * transactions into the shared document — which never shrinks — and hand every
 * peer ten chapters to load, nine of which are already obsolete on arrival.
 * A trailing debounce turns the whole gesture into a single write of where the
 * reader actually landed. Short enough that a normal one-chapter step still
 * feels immediate to everyone else.
 */
const PUBLISH_DEBOUNCE_MS = 150;

const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  allowedNavigators: null,
  allowedDecorators: null,
  hostUserId: null,
  highlightDurationSeconds: 16,
  endedAt: null,
  shareTranslation: false,
  coHostUserIds: [],
};

function getSessionDataSnapshot(
  readingState: Pick<
    BibleReadingState,
    "translationId" | "bookId" | "chapterNumber" | "scrollToVerse"
  >
): SessionData {
  return {
    translationId: readingState.translationId.value,
    bookId: readingState.bookId.value,
    chapterNumber: readingState.chapterNumber.value,
    scrollToVerse: readingState.scrollToVerse.value,
  };
}

function getSessionDataFromMap(
  stateMap: SharedMap<SessionData[keyof SessionData]>
): SessionData {
  return {
    translationId: toStringOrNull(stateMap.get("translationId")),
    bookId: toStringOrNull(stateMap.get("bookId")),
    chapterNumber: toPositiveIntOrNull(stateMap.get("chapterNumber")),
    scrollToVerse: toPositiveIntOrNull(stateMap.get("scrollToVerse")),
  };
}

function toStringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const stringValues = value.filter((item) => typeof item === "string");
  return stringValues.length === value.length ? stringValues : null;
}

function getSessionOptionsFromMap(
  optionsMap: SharedMap<SessionOptionValue>
): SessionOptions {
  const rawDuration = optionsMap.get("highlightDurationSeconds");
  const rawEndedAt = optionsMap.get("endedAt");
  const rawShareTranslation = optionsMap.get("shareTranslation");
  return {
    allowedNavigators: toStringArrayOrNull(optionsMap.get("allowedNavigators")),
    allowedDecorators: toStringArrayOrNull(optionsMap.get("allowedDecorators")),
    hostUserId: toStringOrNull(optionsMap.get("hostUserId")),
    highlightDurationSeconds:
      typeof rawDuration === "number" &&
      Number.isFinite(rawDuration) &&
      rawDuration > 0
        ? rawDuration
        : rawDuration === null
          ? null
          : DEFAULT_SESSION_OPTIONS.highlightDurationSeconds,
    endedAt:
      typeof rawEndedAt === "number" && Number.isFinite(rawEndedAt)
        ? rawEndedAt
        : null,
    shareTranslation:
      typeof rawShareTranslation === "boolean"
        ? rawShareTranslation
        : DEFAULT_SESSION_OPTIONS.shareTranslation,
    coHostUserIds: toStringArrayOrNull(optionsMap.get("coHostUserIds")) ?? [],
  };
}

function stringArraysMatch(
  left: string[] | null,
  right: string[] | null
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function sessionOptionsMatch(
  left: SessionOptions,
  right: SessionOptions
): boolean {
  return (
    stringArraysMatch(left.allowedNavigators, right.allowedNavigators) &&
    stringArraysMatch(left.allowedDecorators, right.allowedDecorators) &&
    left.hostUserId === right.hostUserId &&
    left.highlightDurationSeconds === right.highlightDurationSeconds &&
    left.endedAt === right.endedAt &&
    left.shareTranslation === right.shareTranslation &&
    stringArraysMatch(left.coHostUserIds, right.coHostUserIds)
  );
}

function createSessionDecorationKey(
  connectionId: string,
  decorationId: string
): string {
  return JSON.stringify([connectionId, decorationId]);
}

function parseSessionDecorationKey(key: string): {
  connectionId: string;
  decorationId: string;
} | null {
  try {
    const value = JSON.parse(key);
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "string" &&
      typeof value[1] === "string"
    ) {
      return {
        connectionId: value[0],
        decorationId: value[1],
      };
    }
  } catch {
    return null;
  }

  return null;
}

function toSessionDecorationInput(
  decoration: VerseDecoration
): VerseDecorationInput {
  return {
    targetContent: decoration.targetContent,
    startIndex: decoration.startIndex,
    endIndex: decoration.endIndex,
    className: decoration.className,
    style: decoration.style,
    highlight: decoration.highlight,
    removeAfterMs: decoration.removeAfterMs,
    preserveOnChapterChange: decoration.preserveOnChapterChange,
    translationId: decoration.translationId,
  };
}

function decorationsMatch(
  left: VerseDecoration,
  right: VerseDecoration
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sessionDataMatches(left: SessionData, right: SessionData): boolean {
  return (
    left.translationId === right.translationId &&
    left.bookId === right.bookId &&
    left.chapterNumber === right.chapterNumber
  );
}

function applySessionDataToReadingState(
  readingState: Pick<
    BibleReadingState,
    "translationId" | "bookId" | "chapterNumber" | "scrollToVerse"
  >,
  sessionData: SessionData
) {
  // Batched because the reading state's content loader watches all three
  // position signals. Written one at a time, an incomplete remote update runs
  // the loader up to three times for a single change — briefly asking for
  // combinations like the new translation with the old book and chapter, and
  // starting and cancelling a request for each.
  batch(() => {
    if (readingState.translationId.value !== sessionData.translationId) {
      readingState.translationId.value =
        sessionData.translationId ?? readingState.translationId.peek();
    }
    if (readingState.bookId.value !== sessionData.bookId) {
      readingState.bookId.value =
        sessionData.bookId ?? readingState.bookId.peek();
    }
    if (
      sessionData.chapterNumber !== null &&
      readingState.chapterNumber.value !== sessionData.chapterNumber
    ) {
      readingState.chapterNumber.value = sessionData.chapterNumber;
    }
    if (readingState.scrollToVerse.value !== sessionData.scrollToVerse) {
      readingState.scrollToVerse.value = sessionData.scrollToVerse;
    }
  });
}

function canLoadSessionData(sessionData: SessionData): sessionData is {
  translationId: string;
  bookId: string;
  chapterNumber: number;
  scrollToVerse: number | null;
} {
  return (
    typeof sessionData.translationId === "string" &&
    !!sessionData.translationId &&
    typeof sessionData.bookId === "string" &&
    !!sessionData.bookId &&
    typeof sessionData.chapterNumber === "number" &&
    Number.isFinite(sessionData.chapterNumber) &&
    sessionData.chapterNumber > 0
  );
}

/**
 * Deterministic animal-icon + color assignment for a user.
 *
 * One function, one rule: a given user key always maps to the same
 * `(icon, color)` pair — everywhere on every client. No list context, no
 * walk-forward. Used for:
 *   - The sidebar self-avatar (bottom-right), when other people are present
 *   - The connected-users list inside a shared tab
 *   - The "Shared with you" toasts
 *
 * We lift the palette to 10 icons × 12 colors = 120 combos. Collision
 * probability for N users visible at the same time is `1 - Π(1 - i/120)`
 * for i ∈ [0..N-1] — ~4% for 3 users, ~8% for 5 users. In exchange we get
 * full cross-client and cross-surface consistency: the color you see on
 * the sidebar is the same color the tab shows is the same color every
 * other participant sees for you.
 *
 * NOTE: Make sure to keep icons updated in the translation files (e.g. `en.json`)
 */
const USER_ANIMAL_ICONS = [
  "forest", // tree
  "park", // log
  "eco", // leaf
  "pets", // dog
  "cruelty_free", // bunny-style
  "local_cafe", // coffee
  "local_florist", // flower
  "grass", // grass
  "potted_plant", // plant
  "nature", // tree
] as const;

// NOTE: Make sure to keep colors updated in the translation files (e.g. `en.json`)
const USER_PRESENCE_COLORS = [
  ["#34D399", "emerald"], // emerald
  ["#60A5FA", "blue"], // blue
  ["#F472B6", "pink"], // pink
  ["#FBBF24", "amber"], // amber
  ["#A78BFA", "violet"], // violet
  ["#F87171", "red"], // red
  ["#10B981", "green"], // green
  ["#F59E0B", "orange"], // orange
  ["#06B6D4", "cyan"], // cyan
  ["#EC4899", "rose"], // rose
  ["#8B5CF6", "purple"], // purple
  ["#14B8A6", "teal"], // teal
] as const;

function hashUserKey(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Pure-hash user visual. Same input → same output, forever. The icon and
 * color are derived independently from the hash so small changes to the
 * key (e.g. user id suffix) distribute across the whole palette.
 */
export function getUserAnimalVisual(key: string): ConnectionSessionUserVisual {
  const normalized = key && key.length > 0 ? key : "anonymous";
  const hash = hashUserKey(normalized);
  const iconIndex = hash % USER_ANIMAL_ICONS.length;
  const colorIndex =
    Math.floor(hash / USER_ANIMAL_ICONS.length) % USER_PRESENCE_COLORS.length;
  const color = USER_PRESENCE_COLORS[colorIndex]!;
  return {
    defaultIcon: USER_ANIMAL_ICONS[iconIndex]!,
    color: color[0],
    colorName: color[1],
  };
}

/**
 * Given a `ConnectedSessionUser`, returns the SAME key that the sidebar
 * self-avatar would use for this same person on their own client. This
 * guarantees visual consistency between "how I see myself in the sidebar"
 * and "how others see me in the connected users row".
 */
export function getConnectedUserVisualKey(user: {
  userId?: string | null;
  connectionId?: string | null;
}): string {
  return user.userId ?? user.connectionId ?? "anonymous";
}

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
   * Each still-connected participant's own reading position, keyed by
   * connectionId. A peer who hasn't broadcast one yet is absent rather than
   * guessed at, so callers that must show something should fall back to
   * `readingState` themselves.
   */
  participantPositions: ReadonlySignal<
    ReadonlyMap<string, ParticipantReadingPosition>
  >;

  /**
   * Whether this client's own connection to the shared document is
   * currently synced. False while resyncing (e.g. right after a mobile
   * device resumes from the background) — during that window, this
   * client's own view of `connectedUsers` can't be trusted to reflect who
   * is actually still connected.
   */
  isSynced: ReadonlySignal<boolean>;

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

function createSessionId(): string {
  return `session-${uuid()}`;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toPositiveIntOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

async function createBibleReadingSession(
  os: CasualOSManager,
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  readingExtensionManager: BibleReadingExtensionManager | undefined,
  id: string,
  defaultOptions?: SessionOptions,
  startPosition?: SessionStartPosition,
  getAnnotationsManager?: () => AnnotationsManager | undefined
): Promise<BibleReadingSession> {
  const readingState = createBibleReadingState(
    dataManager,
    highlightsManager,
    i18nManager,
    // `isShared` last: a caller's start position must not be able to turn a
    // session's reading state back into an unshared one.
    { ...startPosition, isShared: true },
    undefined,
    readingExtensionManager,
    getAnnotationsManager
  );
  const document = await os.getSharedDocument(null, id, "session_data");
  const stateMap =
    document.getMap<SessionData[keyof SessionData]>("reading_state");
  const optionsMap = document.getMap<SessionOptionValue>("options");
  const decorationsMap = document.getMap<SessionDecorationValue>("decorations");
  // Enabled reading extensions and their custom data, keyed by extension id.
  // Enabling an extension (and editing its data) propagates to every
  // participant, who auto-enables it when the extension is registered locally.
  const extensionsMap =
    document.getMap<SessionExtensionValue>("reading_extensions");
  // Per-connection identity broadcast. The OS doesn't re-emit
  // remoteClients events when a peer logs in or out, so without this map
  // joiners would forever see the userId/profile each peer had at connect
  // time. Each client writes its own current {userId, profile} keyed by
  // its connectionId; everyone else reads from here when building
  // `connectedUsers`.
  const userProfilesMap =
    document.getMap<SharedUserProfileEntry>("user_profiles");
  // Per-connection reading position, written only by its own client. See
  // `ParticipantReadingPosition` for why the session-wide position can't stand
  // in for this.
  const readingPositionsMap =
    document.getMap<ParticipantReadingPosition>("reading_positions");
  const options = signal<SessionOptions>(DEFAULT_SESSION_OPTIONS);
  const allUsers = signal<ConnectedSessionUser[]>([]);
  const connectedUsers = signal<ConnectedSessionUser[]>([]);
  const participantPositions = signal<
    ReadonlyMap<string, ParticipantReadingPosition>
  >(new Map());
  const connectedClients = new Map<string, SessionConnectionInfo>();
  const profileCache = new Map<string, UserProfile>();
  const localConnectionId = os.connectionId;
  // (typeof configBot !== "undefined" ? toStringOrNull(configBot?.id) : null) ??
  // "local";
  const decorationOwners = new Map<string, string>();

  const currentUser = computed(
    () => connectedUsers.value.find((user) => user.isSelf) ?? null
  );
  const localSessionId = computed(
    () => loginManager.userId.value ?? localConnectionId
  );

  if (defaultOptions) {
    document.transact(() => {
      optionsMap.set("allowedNavigators", defaultOptions.allowedNavigators);
      optionsMap.set("allowedDecorators", defaultOptions.allowedDecorators);
      // Only claim host on first-time creation — never overwrite an
      // existing hostUserId written by a previous creator.
      if (!optionsMap.get("hostUserId") && defaultOptions.hostUserId) {
        optionsMap.set("hostUserId", defaultOptions.hostUserId);
      }
      if (optionsMap.get("highlightDurationSeconds") === undefined) {
        optionsMap.set(
          "highlightDurationSeconds",
          defaultOptions.highlightDurationSeconds
        );
      }
      if (optionsMap.get("shareTranslation") === undefined) {
        optionsMap.set("shareTranslation", defaultOptions.shareTranslation);
      }
      if (optionsMap.get("coHostUserIds") === undefined) {
        optionsMap.set("coHostUserIds", defaultOptions.coHostUserIds);
      }
    });
  }

  options.value = getSessionOptionsFromMap(optionsMap);

  let applyingRemoteState = false;
  let lastLocallyWrittenState: SessionData | null = null;
  /** The remote position currently being applied to the local reader. */
  let pendingRemoteTarget: SessionData | null = null;
  /** The newest remote position we have been told about but not applied yet. */
  let pendingRemoteSync: SessionData | null = null;
  /** Non-null while `queueRemoteSync`'s drain loop is running. */
  let remoteSyncDrain: Promise<void> | null = null;
  /** Armed while a local navigation is waiting to be published to peers. */
  let publishTimer: ReturnType<typeof setTimeout> | null = null;
  /** Armed while our own reading position is waiting to be broadcast. */
  let positionBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  let remoteClientsVersion = 0;
  let applyingRemoteDecorations = false;
  let applyingRemoteExtensions = false;

  const userCanNavigate = (sessionId: string): boolean => {
    // Hosts and co-hosts may always navigate, even when restricted.
    if (isSessionHost(options.value, sessionId)) {
      return true;
    }
    const { allowedNavigators } = options.value;
    if (!allowedNavigators || allowedNavigators.length === 0) {
      return true;
    }
    return allowedNavigators.includes(sessionId);
  };

  const userCanDecorate = (sessionId: string): boolean => {
    // Hosts and co-hosts may always decorate, even when restricted.
    if (isSessionHost(options.value, sessionId)) {
      return true;
    }
    const { allowedDecorators } = options.value;
    if (!allowedDecorators || allowedDecorators.length === 0) {
      return true;
    }
    return allowedDecorators.includes(sessionId);
  };

  const getSharedDecorationEntries = () => {
    const entries = new Map<
      string,
      { key: string; connectionId: string; decoration: VerseDecoration }
    >();

    decorationsMap.forEach((value, key) => {
      const parsedKey = parseSessionDecorationKey(key);
      if (!parsedKey || !value || value.id !== parsedKey.decorationId) {
        return;
      }

      entries.set(parsedKey.decorationId, {
        key,
        connectionId: parsedKey.connectionId,
        decoration: value,
      });
    });

    return entries;
  };

  const syncDecorationsFromSession = () => {
    const sharedDecorationEntries = getSharedDecorationEntries();

    applyingRemoteDecorations = true;
    try {
      const currentDecorations = readingState.decorations.value;
      const currentDecorationIds = new Set(
        currentDecorations.map((decoration) => decoration.id)
      );

      for (const decoration of currentDecorations) {
        const nextSharedDecoration = sharedDecorationEntries.get(decoration.id);
        if (!nextSharedDecoration) {
          if (decorationOwners.has(decoration.id)) {
            readingState.removeDecoration(decoration.id);
            decorationOwners.delete(decoration.id);
          }
        }
      }

      for (const [decorationId, entry] of sharedDecorationEntries) {
        decorationOwners.set(decorationId, entry.connectionId);

        const existingDecoration = readingState.decorations.value.find(
          (decoration) => decoration.id === decorationId
        );

        if (
          existingDecoration &&
          decorationsMatch(existingDecoration, entry.decoration)
        ) {
          continue;
        }

        if (currentDecorationIds.has(decorationId)) {
          readingState.removeDecoration(decorationId);
        }
        readingState.decorateVerses(
          entry.decoration.bookId,
          entry.decoration.chapterNumber,
          entry.decoration.verses,
          toSessionDecorationInput(entry.decoration),
          entry.decoration.id
        );
      }
    } finally {
      applyingRemoteDecorations = false;
    }
  };

  const syncParticipantPositions = () => {
    const next = new Map<string, ParticipantReadingPosition>();
    readingPositionsMap.forEach((value, connectionId) => {
      if (typeof connectionId !== "string") {
        return;
      }
      // A client that vanished without disposing leaves its entry behind and
      // the document never shrinks, so connectivity — not the map — decides
      // who still counts as present.
      if (!connectedClients.has(connectionId)) {
        return;
      }
      const position = parseParticipantReadingPosition(value);
      if (position) {
        next.set(connectionId, position);
      }
    });
    participantPositions.value = next;
  };

  const syncConnectedUsers = async (version: number) => {
    const clients = Array.from(connectedClients.values());
    const nextUsers = await Promise.all(
      clients.map(async (client) => {
        // Prefer the broadcasted identity in `user_profiles` over the
        // connection's frozen userId — that's how we learn that a peer
        // logged in or out mid-session.
        const sharedEntry = parseSharedUserProfileEntry(
          userProfilesMap.get(client.connectionId)
        );
        const effectiveUserId = sharedEntry
          ? sharedEntry.userId
          : client.userId;

        let profile: UserProfile | null = null;
        if (sharedEntry) {
          // Trust the broadcast as the live source of truth — even if
          // `profile` is null (peer is anonymous now) we must use it
          // rather than a stale cache for the old userId.
          profile = sharedEntry.profile;
        } else if (effectiveUserId) {
          const cachedProfile = profileCache.get(effectiveUserId);
          if (cachedProfile) {
            profile = cachedProfile;
          } else {
            try {
              profile = await loginManager.getUserProfile(effectiveUserId);
              profileCache.set(effectiveUserId, profile);
            } catch {
              profile = null;
            }
          }
        }

        const visual = getUserAnimalVisual(client.connectionId);

        return {
          isSelf: client.isSelf,
          connectionId: client.connectionId,
          // sessionId: client.sessionId,
          userId: effectiveUserId,
          profile,
          visual,
          isActive: true,
          joinedAtMs: sharedEntry?.joinedAtMs ?? null,
        };
      })
    );

    if (version !== remoteClientsVersion) {
      return;
    }

    connectedUsers.value = nextUsers;

    const previousUsersByConnectionId = new Map(
      allUsers.value.map((user) => [user.connectionId, user] as const)
    );
    const nextUsersByConnectionId = new Map<string, ConnectedSessionUser>();

    for (const previousUser of previousUsersByConnectionId.values()) {
      nextUsersByConnectionId.set(previousUser.connectionId, {
        ...previousUser,
        isActive: false,
      });
    }

    for (const nextUser of nextUsers) {
      nextUsersByConnectionId.set(nextUser.connectionId, nextUser);
    }

    userProfilesMap.forEach((value, connectionId) => {
      if (typeof connectionId !== "string") {
        return;
      }
      if (nextUsersByConnectionId.has(connectionId)) {
        return;
      }

      const sharedEntry = parseSharedUserProfileEntry(value);
      if (!sharedEntry) {
        return;
      }

      nextUsersByConnectionId.set(connectionId, {
        isSelf: connectionId === localConnectionId,
        connectionId,
        userId: sharedEntry.userId,
        profile: sharedEntry.profile,
        visual: getUserAnimalVisual(connectionId),
        isActive: false,
        joinedAtMs: sharedEntry.joinedAtMs,
      });
    });

    allUsers.value = Array.from(nextUsersByConnectionId.values());

    // Connectivity gates which position entries count, so the positions have
    // to be rebuilt whenever the connected set changes.
    syncParticipantPositions();
  };

  // When the translation isn't shared, keep the local reader on their own
  // translation while still following the shared book/chapter/scroll. This
  // substitutes the local translationId for whatever a peer navigated with.
  const toEffectiveSessionData = (sessionData: SessionData): SessionData => {
    if (options.value.shareTranslation) {
      return sessionData;
    }
    return {
      ...sessionData,
      translationId: readingState.translationId.value,
    };
  };

  /**
   * Moves the local reader to one remote position. Never runs concurrently with
   * itself — see `queueRemoteSync`, which owns the scheduling.
   */
  const applyRemoteSessionData = async (rawSessionData: SessionData) => {
    const sessionData = toEffectiveSessionData(rawSessionData);
    if (!canLoadSessionData(sessionData)) {
      applyingRemoteState = true;
      try {
        applySessionDataToReadingState(readingState, sessionData);
      } finally {
        applyingRemoteState = false;
      }
      return;
    }

    try {
      pendingRemoteTarget = sessionData;
      const options =
        typeof sessionData.scrollToVerse === "number"
          ? { scrollToVerse: sessionData.scrollToVerse }
          : undefined;
      await readingState.selectTranslationAndChapter(
        sessionData.translationId,
        sessionData.bookId,
        sessionData.chapterNumber,
        options
      );
    } catch (error) {
      // A newer target is already queued, so this failure is moot — reporting
      // it would show an error for a chapter we are no longer going to.
      if (pendingRemoteSync) {
        return;
      }
      readingState.error.value =
        error instanceof Error
          ? error.message
          : "Failed to sync shared reading session.";
    } finally {
      if (pendingRemoteTarget === sessionData) {
        pendingRemoteTarget = null;
      }
    }
  };

  /**
   * Points the reader at a remote position, coalescing anything that arrives
   * while an earlier one is still being applied.
   *
   * Only ever one application in flight, always toward the newest position we
   * know about: a peer skimming ten chapters costs us one chapter load, not
   * ten, and the chapters they passed through are never rendered or published.
   *
   * This replaced a version-counter scheme that ran one application per change
   * event and had each superseded one relaunch itself on completion. Two
   * overlapping events were enough to make that self-sustaining — each
   * completion invalidated the other and spawned a replacement — which froze
   * the tab and grew the heap until it crashed. There is deliberately no retry
   * here: the loop below continues only while genuinely newer data exists.
   */
  const queueRemoteSync = (sessionData: SessionData): Promise<void> => {
    pendingRemoteSync = sessionData;
    if (!remoteSyncDrain) {
      remoteSyncDrain = (async () => {
        try {
          while (pendingRemoteSync) {
            const next = pendingRemoteSync;
            pendingRemoteSync = null;
            await applyRemoteSessionData(next);
          }
        } finally {
          remoteSyncDrain = null;
        }
      })();
    }
    return remoteSyncDrain;
  };

  const initialSessionData = getSessionDataFromMap(stateMap);
  await queueRemoteSync(initialSessionData);

  // Publish where the session starts immediately, instead of leaving it to the
  // local publish debounce below: until the map holds a position there is
  // nothing for a joiner to load, so they settle on the default book and
  // publish *that* — pulling the host off the chapter they started from.
  //
  // Written after the initial sync above on purpose. Seeded any earlier, that
  // sync would read our own position back out of the map and re-navigate the
  // reader to the chapter it is already on, pushing a history entry for it.
  if (startPosition?.initialBookId && !toStringOrNull(stateMap.get("bookId"))) {
    document.transact(() => {
      stateMap.set("translationId", startPosition.initialTranslationId ?? null);
      stateMap.set("bookId", startPosition.initialBookId ?? null);
      stateMap.set("chapterNumber", startPosition.initialChapterNumber ?? null);
    });
  }

  syncDecorationsFromSession();

  const mapSubscription = stateMap.changes.subscribe(() => {
    const nextSessionData = getSessionDataFromMap(stateMap);

    if (
      lastLocallyWrittenState &&
      sessionDataMatches(nextSessionData, lastLocallyWrittenState)
    ) {
      lastLocallyWrittenState = null;
      return;
    }

    void queueRemoteSync(nextSessionData);
  });

  const optionsSubscription = optionsMap.changes.subscribe(() => {
    const nextOptions = getSessionOptionsFromMap(optionsMap);
    if (!sessionOptionsMatch(options.value, nextOptions)) {
      options.value = nextOptions;
    }
  });

  const decorationsSubscription = decorationsMap.changes.subscribe(() => {
    syncDecorationsFromSession();
  });

  // When any peer publishes a new identity into `user_profiles`, rebuild
  // the connectedUsers list so their avatar reflects the change.
  const userProfilesSubscription = userProfilesMap.changes.subscribe(() => {
    const nextVersion = ++remoteClientsVersion;
    void syncConnectedUsers(nextVersion);
  });

  // Broadcast the local user's current identity into `user_profiles`
  // whenever it changes, so other peers can re-render our avatar without
  // depending on the OS to re-emit a remoteClients event.
  const stopBroadcastLocalIdentity = effect(() => {
    const userId = loginManager.userId.value;
    const profile = loginManager.profile.value;
    const currentEntry = parseSharedUserProfileEntry(
      userProfilesMap.get(localConnectionId)
    );
    // Stamp the join time on the first broadcast and preserve it across
    // subsequent re-broadcasts (login/logout, profile edits).
    const joinedAtMs = currentEntry?.joinedAtMs ?? Date.now();
    const nextEntry: SharedUserProfileEntry = { userId, profile, joinedAtMs };
    if (
      currentEntry &&
      sharedUserProfileEntriesMatch(currentEntry, nextEntry)
    ) {
      return;
    }
    try {
      document.transact(() => {
        userProfilesMap.set(localConnectionId, nextEntry);
      });
    } catch {
      // Best-effort — if the broadcast can't be written, peers will
      // still see whatever was last published (possibly stale).
    }
  });

  const broadcastLocalPosition = () => {
    const bookId = readingState.bookId.value;
    const chapterNumber = readingState.chapterNumber.value;
    if (!bookId || chapterNumber <= 0) {
      return;
    }
    const currentEntry = parseParticipantReadingPosition(
      readingPositionsMap.get(localConnectionId)
    );
    if (
      currentEntry &&
      currentEntry.bookId === bookId &&
      currentEntry.chapterNumber === chapterNumber
    ) {
      return;
    }
    try {
      document.transact(() => {
        readingPositionsMap.set(localConnectionId, { bookId, chapterNumber });
      });
    } catch {
      // Best-effort — peers keep the last position we managed to publish.
    }
  };

  // Deliberately not gated on `userCanNavigate` the way `stopSync` is: this
  // says where we are, which a participant who may not move the session is
  // still entitled to report. Debounced on the same window so skimming
  // chapters leaves one entry rather than one per chapter in a document that
  // never shrinks. `scrollToVerse` is deliberately not read — presence is
  // chapter-grained, and tracking it would rewrite the entry on every scroll.
  const stopBroadcastLocalPosition = effect(() => {
    void readingState.bookId.value;
    void readingState.chapterNumber.value;
    if (positionBroadcastTimer !== null) {
      clearTimeout(positionBroadcastTimer);
    }
    positionBroadcastTimer = setTimeout(() => {
      positionBroadcastTimer = null;
      broadcastLocalPosition();
    }, PUBLISH_DEBOUNCE_MS);
  });

  const readingPositionsSubscription = readingPositionsMap.changes.subscribe(
    () => {
      syncParticipantPositions();
    }
  );

  const subscribeToRemoteClients = () =>
    document.remoteClients.subscribe((event) => {
      if (event.type === "client_connected") {
        connectedClients.set(event.client.connectionId, {
          ...event.client,
          isSelf: event.isSelf,
        });
      } else {
        connectedClients.delete(event.client.connectionId);
      }

      const nextVersion = ++remoteClientsVersion;
      void syncConnectedUsers(nextVersion);
    });

  let remoteClientsSubscription = subscribeToRemoteClients();

  // Rebuilds the presence subscription from scratch. The OS reports every
  // peer as disconnected when our own connection drops, but on reconnect it
  // silently suppresses the re-sent peer list, so presence would otherwise
  // stay empty forever — including our own entry (see `clearBranchDeviceCache`).
  // Dropping the subscription resets the document's peer list, clearing the
  // OS cache lets the re-sent list through, and re-subscribing asks for it.
  const rebuildRemoteClientsSubscription = () => {
    remoteClientsSubscription.unsubscribe();
    os.clearBranchDeviceCache(null, id, "session_data");
    connectedClients.clear();
    remoteClientsSubscription = subscribeToRemoteClients();
    void syncConnectedUsers(++remoteClientsVersion);
  };

  // `getSharedDocument()` already awaited the first sync before returning,
  // so we start out synced. Keep listening for the life of the session —
  // unlike that initial await, this lets callers tell "my own connection
  // just dropped/is resyncing" apart from "the other client actually left".
  const isSynced = signal(true);
  const statusUpdatedSubscription = document.onStatusUpdated.subscribe(
    (status) => {
      if (status.type !== "sync") {
        return;
      }
      const wasSynced = isSynced.value;
      isSynced.value = status.synced;
      // Only a genuine drop-and-recover needs the presence rebuild — not the
      // initial sync, which already delivered a fresh peer list.
      if (status.synced && !wasSynced) {
        rebuildRemoteClientsSubscription();
      }
    }
  );

  void syncConnectedUsers(++remoteClientsVersion);

  /**
   * The local position that ought to be published, or null when the shared map
   * already agrees with us (or we aren't allowed to publish at all).
   *
   * Reads the position signals, so calling this inside `stopSync` is what makes
   * that effect track local navigation. It is also called again at flush time
   * so a debounced burst publishes where the reader actually ended up rather
   * than where they were when the timer was armed.
   */
  const resolveSessionDataToPublish = (): SessionData | null => {
    // Read every signal this decision depends on before any early return.
    // `effect` rebuilds its dependency list from whatever the run touched, so a
    // run that bailed out before reading anything would leave `stopSync` with
    // no dependencies at all — silently ending local sync for the rest of the
    // session. Reachable via the `applyingRemoteState` guard below, which is
    // held while a peer's partial position is written straight to the signals.
    const rawNextSessionData = getSessionDataSnapshot(readingState);
    const shareTranslation = options.value.shareTranslation;
    const canNavigate = userCanNavigate(localSessionId.value);

    if (applyingRemoteState || !canNavigate) {
      return null;
    }

    const currentSessionData = getSessionDataFromMap(stateMap);

    // When the translation isn't shared, never publish our translationId —
    // mask it with whatever is already in the shared map so a local
    // translation change neither counts as a change nor gets written.
    const nextSessionData = shareTranslation
      ? rawNextSessionData
      : {
          ...rawNextSessionData,
          translationId: currentSessionData.translationId,
        };

    // Our own echo of the remote position we are in the middle of applying.
    if (
      pendingRemoteTarget &&
      sessionDataMatches(nextSessionData, pendingRemoteTarget)
    ) {
      return null;
    }

    if (sessionDataMatches(nextSessionData, currentSessionData)) {
      return null;
    }

    return nextSessionData;
  };

  const publishLocalSessionData = () => {
    const nextSessionData = resolveSessionDataToPublish();
    if (!nextSessionData) {
      return;
    }
    const currentSessionData = getSessionDataFromMap(stateMap);

    // Reaching here means a local navigation survived the debounce and every
    // guard, so it beats any remote position still waiting to be applied —
    // otherwise the drain would pull the reader straight back off the chapter
    // they just chose. Deliberately not done in `stopSync`: mid-navigation the
    // position signals pass through states that match nothing, and discarding
    // a peer's target on one of those would lose it for good.
    pendingRemoteSync = null;

    lastLocallyWrittenState = nextSessionData;
    document.transact(() => {
      if (currentSessionData.translationId !== nextSessionData.translationId) {
        stateMap.set("translationId", nextSessionData.translationId);
      }
      if (currentSessionData.bookId !== nextSessionData.bookId) {
        stateMap.set("bookId", nextSessionData.bookId);
      }
      if (currentSessionData.chapterNumber !== nextSessionData.chapterNumber) {
        stateMap.set("chapterNumber", nextSessionData.chapterNumber);
      }
      if (currentSessionData.scrollToVerse !== nextSessionData.scrollToVerse) {
        stateMap.set("scrollToVerse", nextSessionData.scrollToVerse);
      }
    });
  };

  const schedulePublish = () => {
    if (publishTimer !== null) {
      clearTimeout(publishTimer);
    }
    publishTimer = setTimeout(() => {
      publishTimer = null;
      publishLocalSessionData();
    }, PUBLISH_DEBOUNCE_MS);
  };

  const flushPendingPublish = () => {
    if (publishTimer === null) {
      return;
    }
    clearTimeout(publishTimer);
    publishTimer = null;
    publishLocalSessionData();
  };

  const stopSync = effect(() => {
    // Tracks the local position through `resolveSessionDataToPublish`. The
    // decision to publish is re-made at flush time against the settled
    // position, so a false positive here only costs an armed timer.
    if (!resolveSessionDataToPublish()) {
      return;
    }
    schedulePublish();
  });

  const stopDecorationSync = effect(() => {
    void readingState.translationId.value;
    void readingState.bookId.value;
    void readingState.chapterNumber.value;
    // We need to read the decorations signal before
    // checking any early-exit conditions, so that this effect re-runs whenever decorations change
    const currentDecorations = readingState.decorations.value;

    if (applyingRemoteDecorations) {
      return;
    }

    if (!userCanDecorate(localSessionId.value)) {
      return;
    }

    const localDecorations = currentDecorations.filter((decoration) => {
      const owner = decorationOwners.get(decoration.id);
      if (!owner) {
        decorationOwners.set(decoration.id, localConnectionId);
        return true;
      }

      return owner === localConnectionId;
    });

    const sharedDecorationEntries = getSharedDecorationEntries();
    const localSharedDecorations = Array.from(
      sharedDecorationEntries.values()
    ).filter((entry) => entry.connectionId === localConnectionId);
    const localDecorationIds = new Set(
      localDecorations.map((decoration) => decoration.id)
    );

    const keysToDelete = localSharedDecorations
      .filter((entry) => !localDecorationIds.has(entry.decoration.id))
      .map((entry) => entry.key);

    const decorationsToUpsert = localDecorations.filter((decoration) => {
      const existingDecoration = sharedDecorationEntries.get(
        decoration.id
      )?.decoration;
      return (
        !existingDecoration || !decorationsMatch(existingDecoration, decoration)
      );
    });

    if (keysToDelete.length === 0 && decorationsToUpsert.length === 0) {
      return;
    }

    document.transact(() => {
      for (const key of keysToDelete) {
        const parsedKey = parseSessionDecorationKey(key);
        decorationsMap.delete(key);
        if (parsedKey) {
          decorationOwners.delete(parsedKey.decorationId);
        }
      }

      for (const decoration of decorationsToUpsert) {
        const key = createSessionDecorationKey(
          localConnectionId,
          decoration.id
        );
        decorationsMap.set(key, decoration);
        decorationOwners.set(decoration.id, localConnectionId);
      }
    });
  });

  // --- Reading-extension sync ---------------------------------------------
  // Only wired when a reading-extension registry is available (always so in the
  // app; omitted in some unit tests). When present, the enabled-extension set
  // and each extension's data converge across all participants.
  let stopExtensionSync: (() => void) | null = null;
  let extensionsSubscription: { unsubscribe: () => void } | null = null;

  if (readingExtensionManager) {
    const registry = readingExtensionManager;

    // Applies the shared enabled-extension set + data onto the local reading
    // state. Extensions the local client hasn't registered are skipped.
    const syncExtensionsFromSession = () => {
      applyingRemoteExtensions = true;
      try {
        const remoteEntries = new Map<string, SessionExtensionValue>();
        extensionsMap.forEach((value, key) => {
          remoteEntries.set(key, value);
        });

        for (const [extensionId, value] of remoteEntries) {
          if (!value || value.enabled === false) {
            continue;
          }
          if (!registry.getReadingExtension(extensionId)) {
            continue;
          }
          readingState.enableExtension(extensionId, value.data);
        }

        // Disable locally-enabled extensions no longer in the shared set.
        for (const runtime of readingState.enabledExtensions.value) {
          const remote = remoteEntries.get(runtime.id);
          if (!remote || remote.enabled === false) {
            readingState.disableExtension(runtime.id);
          }
        }
      } finally {
        applyingRemoteExtensions = false;
      }
    };

    syncExtensionsFromSession();

    // Mirror the local enabled-extension set + each extension's data into the
    // shared map so every participant converges. Reading `runtime.data.value`
    // here means data edits also propagate.
    stopExtensionSync = effect(() => {
      const snapshot = readingState.enabledExtensions.value.map((runtime) => ({
        id: runtime.id,
        data: runtime.data.value,
      }));

      if (applyingRemoteExtensions) {
        return;
      }

      // Extension data (e.g. playlist queue/step) drives navigation just like
      // ordinary chapter navigation, so it's gated by the same "only host can
      // navigate" restriction as `stopSync` above — otherwise a restricted
      // participant could still advance a playlist for everyone.
      if (!userCanNavigate(localSessionId.value)) {
        return;
      }

      const localIds = new Set(snapshot.map((entry) => entry.id));

      const keysToDelete: string[] = [];
      extensionsMap.forEach((_value, key) => {
        if (!localIds.has(key)) {
          keysToDelete.push(key);
        }
      });

      const entriesToUpsert = snapshot.filter((entry) => {
        const existing = extensionsMap.get(entry.id);
        return (
          !existing ||
          existing.enabled !== true ||
          !extensionDataMatches(existing.data, entry.data)
        );
      });

      if (keysToDelete.length === 0 && entriesToUpsert.length === 0) {
        return;
      }

      document.transact(() => {
        for (const key of keysToDelete) {
          extensionsMap.delete(key);
        }
        for (const entry of entriesToUpsert) {
          extensionsMap.set(entry.id, { enabled: true, data: entry.data });
        }
      });
    });

    extensionsSubscription = extensionsMap.changes.subscribe(() => {
      syncExtensionsFromSession();
    });
  }

  const updateOptions = (newOptions: Partial<SessionOptions>) => {
    const currentOptions = getSessionOptionsFromMap(optionsMap);
    const nextOptions: SessionOptions = {
      allowedNavigators:
        typeof newOptions.allowedNavigators === "undefined"
          ? currentOptions.allowedNavigators
          : newOptions.allowedNavigators,
      allowedDecorators:
        typeof newOptions.allowedDecorators === "undefined"
          ? currentOptions.allowedDecorators
          : newOptions.allowedDecorators,
      hostUserId:
        typeof newOptions.hostUserId === "undefined"
          ? currentOptions.hostUserId
          : newOptions.hostUserId,
      highlightDurationSeconds:
        typeof newOptions.highlightDurationSeconds === "undefined"
          ? currentOptions.highlightDurationSeconds
          : newOptions.highlightDurationSeconds,
      endedAt:
        typeof newOptions.endedAt === "undefined"
          ? currentOptions.endedAt
          : newOptions.endedAt,
      shareTranslation:
        typeof newOptions.shareTranslation === "undefined"
          ? currentOptions.shareTranslation
          : newOptions.shareTranslation,
      coHostUserIds:
        typeof newOptions.coHostUserIds === "undefined"
          ? currentOptions.coHostUserIds
          : newOptions.coHostUserIds,
    };

    if (sessionOptionsMatch(currentOptions, nextOptions)) {
      return;
    }

    document.transact(() => {
      if (
        !stringArraysMatch(
          currentOptions.allowedNavigators,
          nextOptions.allowedNavigators
        )
      ) {
        optionsMap.set("allowedNavigators", nextOptions.allowedNavigators);
      }

      if (
        !stringArraysMatch(
          currentOptions.allowedDecorators,
          nextOptions.allowedDecorators
        )
      ) {
        optionsMap.set("allowedDecorators", nextOptions.allowedDecorators);
      }

      if (currentOptions.hostUserId !== nextOptions.hostUserId) {
        optionsMap.set("hostUserId", nextOptions.hostUserId);
      }

      if (
        currentOptions.highlightDurationSeconds !==
        nextOptions.highlightDurationSeconds
      ) {
        optionsMap.set(
          "highlightDurationSeconds",
          nextOptions.highlightDurationSeconds
        );
      }

      if (currentOptions.endedAt !== nextOptions.endedAt) {
        optionsMap.set("endedAt", nextOptions.endedAt);
      }

      if (currentOptions.shareTranslation !== nextOptions.shareTranslation) {
        optionsMap.set("shareTranslation", nextOptions.shareTranslation);
      }

      if (
        !stringArraysMatch(
          currentOptions.coHostUserIds,
          nextOptions.coHostUserIds
        )
      ) {
        optionsMap.set("coHostUserIds", nextOptions.coHostUserIds);
      }
    });

    if (!sessionOptionsMatch(options.value, nextOptions)) {
      options.value = nextOptions;
    }
  };

  /**
   * Deletes every CRDT entry for a given decoration id (there can be
   * multiple if different connections have written with the same id).
   * The `decorationsMap.changes` subscriber then syncs the removal down
   * to every connected client's local `readingState.decorations` — which
   * is exactly what we want for the transient-highlight timer.
   */
  const removeSharedDecoration = (decorationId: string) => {
    const keysToDelete: string[] = [];
    decorationsMap.forEach((_value, key) => {
      const parsed = parseSessionDecorationKey(key);
      if (parsed && parsed.decorationId === decorationId) {
        keysToDelete.push(key);
      }
    });
    if (keysToDelete.length === 0) {
      // Nothing in the CRDT — make sure the local copy is cleared too in
      // case it got added without a corresponding map entry.
      readingState.removeDecoration(decorationId);
      return;
    }
    document.transact(() => {
      for (const key of keysToDelete) {
        decorationsMap.delete(key);
      }
    });
  };

  const dispose = () => {
    // Publish where the reader ended up before tearing down, so closing a tab
    // mid-skim doesn't leave peers on a chapter we already left.
    flushPendingPublish();
    mapSubscription.unsubscribe();
    optionsSubscription.unsubscribe();
    decorationsSubscription.unsubscribe();
    extensionsSubscription?.unsubscribe();
    userProfilesSubscription.unsubscribe();
    readingPositionsSubscription.unsubscribe();
    remoteClientsSubscription.unsubscribe();
    statusUpdatedSubscription.unsubscribe();
    stopSync();
    stopDecorationSync();
    stopExtensionSync?.();
    stopBroadcastLocalIdentity();
    // Stopped before the delete below, so a broadcast still sitting on the
    // debounce can't re-add the entry we are about to remove.
    stopBroadcastLocalPosition();
    if (positionBroadcastTimer !== null) {
      clearTimeout(positionBroadcastTimer);
      positionBroadcastTimer = null;
    }
    // Drop our identity and position entries so peers' lookups for this
    // connection no longer resolve once we're gone.
    try {
      document.transact(() => {
        userProfilesMap.delete(localConnectionId);
        readingPositionsMap.delete(localConnectionId);
      });
    } catch {
      // Best-effort — the entry will simply linger in the CRDT.
    }
    document.unsubscribe();
  };

  const isHost = (user: ConnectedSessionUser | null): boolean => {
    if (!user) return false;
    const hostUserId = options.value.hostUserId;
    if (!hostUserId) {
      return false;
    }
    return user.userId === hostUserId || user.connectionId === hostUserId;
  };

  return {
    id,
    document,
    options,
    updateOptions,
    readingState,
    allUsers,
    connectedUsers,
    currentUser,
    participantPositions,
    isSynced,
    removeSharedDecoration,
    dispose,
    isHost,
    localSessionId,
    userCanNavigate,
    userCanDecorate,
  };
}

export interface SessionsManager {
  /**
   * Creates a session.
   *
   * @param startPosition Where the session should open. Defaults to the
   * reading state's own default position (the first book of the default
   * translation) when omitted.
   */
  createSession: (
    startPosition?: SessionStartPosition
  ) => Promise<BibleReadingSession>;
  joinSession: (id: string) => Promise<BibleReadingSession>;
}

export function createSessionsManager(
  os: CasualOSManager,
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  readingExtensionManager?: BibleReadingExtensionManager,
  getAnnotationsManager?: () => AnnotationsManager | undefined
): SessionsManager {
  const createSession = async (startPosition?: SessionStartPosition) => {
    const id = createSessionId();
    // Claim host at create time so the settings UI knows which connected
    // user is allowed to change session-wide toggles.
    const hostUserId = loginManager.userId.value ?? os.connectionId;
    return await createBibleReadingSession(
      os,
      dataManager,
      loginManager,
      highlightsManager,
      i18nManager,
      readingExtensionManager,
      id,
      { ...DEFAULT_SESSION_OPTIONS, hostUserId },
      startPosition,
      getAnnotationsManager
    );
  };

  const joinSession = async (id: string) => {
    return await createBibleReadingSession(
      os,
      dataManager,
      loginManager,
      highlightsManager,
      i18nManager,
      readingExtensionManager,
      id,
      undefined,
      undefined,
      getAnnotationsManager
    );
  };

  return {
    createSession,
    joinSession,
  };
}
