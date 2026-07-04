import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import {
  createBibleReadingState,
  type BibleReadingState,
  type VerseDecoration,
  type VerseDecorationInput,
} from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";
import type { BibleDataManager } from "../managers/BibleDataManager";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import type { CasualOSManager } from "./OsManager";
import type {
  SharedDocument,
  SharedMap,
} from "@casual-simulation/aux-common/documents/SharedDocument";
import { v4 as uuid } from "uuid";
import type { I18nManager } from "../i18n/I18nManager";

export interface ConnectedSessionUser extends SessionConnectionInfo {
  /**
   * The user's profile information. Null if the user is not logged in or if the profile information could not be loaded.
   */
  profile: UserProfile | null;

  /**
   * A color assigned to this user for display purposes. This is generated based on the connection ID.
   */
  color: string;
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
 * The shape each client publishes into the session's `user_profiles` map
 * to broadcast their current identity. The connection's `userId` is
 * frozen on the wire at connect time and never re-emitted on login/logout,
 * so this map is how peers learn each other's *current* userId + profile
 * mid-session.
 */
interface SharedUserProfileEntry {
  userId: string | null;
  profile: UserProfile | null;
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
  return { userId, profile };
}

function sharedUserProfileEntriesMatch(
  left: SharedUserProfileEntry,
  right: SharedUserProfileEntry
): boolean {
  return (
    left.userId === right.userId &&
    JSON.stringify(left.profile) === JSON.stringify(right.profile)
  );
}

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
  if (readingState.translationId.value !== sessionData.translationId) {
    readingState.translationId.value =
      sessionData.translationId ?? readingState.translationId.value;
  }
  if (readingState.bookId.value !== sessionData.bookId) {
    readingState.bookId.value = sessionData.bookId;
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

export interface BibleReadingSession {
  id: string;
  document: SharedDocument;
  options: ReadonlySignal<SessionOptions>;
  updateOptions: (newOptions: Partial<SessionOptions>) => void;
  readingState: BibleReadingState;
  connectedUsers: ReadonlySignal<ConnectedSessionUser[]>;
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

export const connectedUserColors = [
  "#34D399",
  "#60A5FA",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#F87171",
  "#10B981",
  "#F59E0B",
];

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return h >>> 0;
}

function getRandomColor(key: string): string {
  const color =
    connectedUserColors[hashString(key) % connectedUserColors.length];
  return color ?? "#E5E7EB";
}

async function createBibleReadingSession(
  os: CasualOSManager,
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  id: string,
  defaultOptions?: SessionOptions
): Promise<BibleReadingSession> {
  const readingState = createBibleReadingState(
    dataManager,
    highlightsManager,
    i18nManager
  );
  const document = await os.getSharedDocument(null, id, "session_data");
  const stateMap =
    document.getMap<SessionData[keyof SessionData]>("reading_state");
  const optionsMap = document.getMap<SessionOptionValue>("options");
  const decorationsMap = document.getMap<SessionDecorationValue>("decorations");
  // Per-connection identity broadcast. The OS doesn't re-emit
  // remoteClients events when a peer logs in or out, so without this map
  // joiners would forever see the userId/profile each peer had at connect
  // time. Each client writes its own current {userId, profile} keyed by
  // its connectionId; everyone else reads from here when building
  // `connectedUsers`.
  const userProfilesMap =
    document.getMap<SharedUserProfileEntry>("user_profiles");
  const options = signal<SessionOptions>(DEFAULT_SESSION_OPTIONS);
  const connectedUsers = signal<ConnectedSessionUser[]>([]);
  const connectedClients = new Map<string, SessionConnectionInfo>();
  const profileCache = new Map<string, UserProfile>();
  const localConnectionId = os.connectionId;
  // (typeof configBot !== "undefined" ? toStringOrNull(configBot?.id) : null) ??
  // "local";
  const decorationOwners = new Map<string, string>();
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
  let syncVersion = 0;
  let pendingRemoteTarget: SessionData | null = null;
  let remoteClientsVersion = 0;
  let applyingRemoteDecorations = false;

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

        const color = getRandomColor(client.connectionId);

        return {
          isSelf: client.isSelf,
          connectionId: client.connectionId,
          // sessionId: client.sessionId,
          userId: effectiveUserId,
          profile,
          color: color,
        };
      })
    );

    if (version !== remoteClientsVersion) {
      return;
    }

    connectedUsers.value = nextUsers;
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

  const syncReadingStateFromSessionData = async (
    rawSessionData: SessionData,
    version: number
  ) => {
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
      if (version !== syncVersion) {
        return;
      }
      readingState.error.value =
        error instanceof Error
          ? error.message
          : "Failed to sync shared reading session.";
    } finally {
      if (version === syncVersion) {
        pendingRemoteTarget = null;
      }
    }

    if (version !== syncVersion) {
      const latestSessionData = getSessionDataFromMap(stateMap);
      if (canLoadSessionData(toEffectiveSessionData(latestSessionData))) {
        const nextVersion = ++syncVersion;
        void syncReadingStateFromSessionData(latestSessionData, nextVersion);
      }
    }
  };

  const initialSessionData = getSessionDataFromMap(stateMap);
  await syncReadingStateFromSessionData(initialSessionData, ++syncVersion);
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

    const version = ++syncVersion;
    void syncReadingStateFromSessionData(nextSessionData, version);
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
    const nextEntry: SharedUserProfileEntry = { userId, profile };
    const currentEntry = parseSharedUserProfileEntry(
      userProfilesMap.get(localConnectionId)
    );
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

  const remoteClientsSubscription = document.remoteClients.subscribe(
    (event) => {
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
    }
  );

  const stopSync = effect(() => {
    if (applyingRemoteState) {
      return;
    }

    if (!userCanNavigate(localSessionId.value)) {
      return;
    }

    const rawNextSessionData = getSessionDataSnapshot(readingState);
    const currentSessionData = getSessionDataFromMap(stateMap);

    // When the translation isn't shared, never publish our translationId —
    // mask it with whatever is already in the shared map so a local
    // translation change neither counts as a change nor gets written.
    const nextSessionData = options.value.shareTranslation
      ? rawNextSessionData
      : {
          ...rawNextSessionData,
          translationId: currentSessionData.translationId,
        };

    if (
      pendingRemoteTarget &&
      sessionDataMatches(nextSessionData, pendingRemoteTarget)
    ) {
      return;
    }

    if (sessionDataMatches(nextSessionData, currentSessionData)) {
      return;
    }

    // Any local change invalidates currently running remote sync operations.
    syncVersion += 1;

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
    mapSubscription.unsubscribe();
    optionsSubscription.unsubscribe();
    decorationsSubscription.unsubscribe();
    userProfilesSubscription.unsubscribe();
    remoteClientsSubscription.unsubscribe();
    stopSync();
    stopDecorationSync();
    stopBroadcastLocalIdentity();
    // Drop our identity entry so peers' lookup for this connection no
    // longer resolves once we're gone.
    try {
      document.transact(() => {
        userProfilesMap.delete(localConnectionId);
      });
    } catch {
      // Best-effort — the entry will simply linger in the CRDT.
    }
    document.unsubscribe();
  };

  return {
    id,
    document,
    options,
    updateOptions,
    readingState,
    connectedUsers,
    removeSharedDecoration,
    dispose,
    localSessionId,
    userCanNavigate,
    userCanDecorate,
  };
}

export interface SessionsManager {
  createSession: () => Promise<BibleReadingSession>;
  joinSession: (id: string) => Promise<BibleReadingSession>;
}

export function createSessionsManager(
  os: CasualOSManager,
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager
): SessionsManager {
  const createSession = async () => {
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
      id,
      { ...DEFAULT_SESSION_OPTIONS, hostUserId }
    );
  };

  const joinSession = async (id: string) => {
    return await createBibleReadingSession(
      os,
      dataManager,
      loginManager,
      highlightsManager,
      i18nManager,
      id
    );
  };

  return {
    createSession,
    joinSession,
  };
}
