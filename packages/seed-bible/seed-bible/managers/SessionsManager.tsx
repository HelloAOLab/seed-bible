import { effect, signal, type ReadonlySignal } from "@preact/signals";
import {
  createBibleReadingState,
  type BibleReadingState,
  type VerseDecoration,
  type VerseDecorationInput,
} from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";
import type { BibleDataManager } from "../managers/BibleDataManager";
import type { LoginManager, UserProfile } from "../managers/LoginManager";

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
}

type SessionOptionValue = SessionOptions[keyof SessionOptions];
type SessionDecorationValue = VerseDecoration;

const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  allowedNavigators: null,
  allowedDecorators: null,
  hostUserId: null,
  highlightDurationSeconds: 16,
  endedAt: null,
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
    left.endedAt === right.endedAt
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
    readingState.translationId.value = sessionData.translationId;
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
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  highlightsManager: HighlightsManager,
  id: string,
  defaultOptions?: SessionOptions
): Promise<BibleReadingSession> {
  const readingState = createBibleReadingState(dataManager, highlightsManager);
  const document = await os.getSharedDocument(null, id, "session_data");
  const stateMap =
    document.getMap<SessionData[keyof SessionData]>("reading_state");
  const optionsMap = document.getMap<SessionOptionValue>("options");
  const decorationsMap = document.getMap<SessionDecorationValue>("decorations");
  const options = signal<SessionOptions>(DEFAULT_SESSION_OPTIONS);
  const connectedUsers = signal<ConnectedSessionUser[]>([]);
  const connectedClients = new Map<string, SessionConnectionInfo>();
  const profileCache = new Map<string, UserProfile>();
  const localConnectionId =
    (typeof configBot !== "undefined" ? toStringOrNull(configBot?.id) : null) ??
    "local";
  const decorationOwners = new Map<string, string>();

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
    });
  }

  options.value = getSessionOptionsFromMap(optionsMap);

  let applyingRemoteState = false;
  let lastLocallyWrittenState: SessionData | null = null;
  let syncVersion = 0;
  let pendingRemoteTarget: SessionData | null = null;
  let remoteClientsVersion = 0;
  let applyingRemoteDecorations = false;

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
        let profile: UserProfile | null = null;

        if (client.userId) {
          const cachedProfile = profileCache.get(client.userId);
          if (cachedProfile) {
            profile = cachedProfile;
          } else {
            try {
              profile = await loginManager.getUserProfile(client.userId);
              profileCache.set(client.userId, profile);
            } catch {
              profile = null;
            }
          }
        }

        const color = getRandomColor(client.connectionId);

        return {
          isSelf: client.isSelf,
          connectionId: client.connectionId,
          sessionId: client.sessionId,
          userId: client.userId,
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

  const syncReadingStateFromSessionData = async (
    sessionData: SessionData,
    version: number
  ) => {
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
      if (canLoadSessionData(latestSessionData)) {
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

    if (
      options.value.allowedNavigators &&
      options.value.allowedNavigators.length > 0
    ) {
      if (
        loginManager.userId.value &&
        !options.value.allowedNavigators.includes(loginManager.userId.value)
      ) {
        return;
      } else if (!options.value.allowedNavigators.includes(localConnectionId)) {
        return;
      }
    }

    const nextSessionData = getSessionDataSnapshot(readingState);

    if (
      pendingRemoteTarget &&
      sessionDataMatches(nextSessionData, pendingRemoteTarget)
    ) {
      return;
    }

    const currentSessionData = getSessionDataFromMap(stateMap);

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

    if (applyingRemoteDecorations) {
      return;
    }

    if (
      options.value.allowedDecorators &&
      options.value.allowedDecorators.length > 0
    ) {
      if (
        loginManager.userId.value &&
        !options.value.allowedDecorators.includes(loginManager.userId.value)
      ) {
        return;
      } else if (!options.value.allowedDecorators.includes(localConnectionId)) {
        return;
      }
    }

    const currentDecorations = readingState.decorations.value;
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
    remoteClientsSubscription.unsubscribe();
    stopSync();
    stopDecorationSync();
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
  };
}

export interface SessionsManager {
  createSession: () => Promise<BibleReadingSession>;
  joinSession: (id: string) => Promise<BibleReadingSession>;
}

export function createSessionsManager(
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  highlightsManager: HighlightsManager
): SessionsManager {
  const createSession = async () => {
    const id = createSessionId();
    // Claim host at create time so the settings UI knows which connected
    // user is allowed to change session-wide toggles.
    const hostUserId =
      loginManager.userId.value ??
      (typeof configBot !== "undefined" ? toStringOrNull(configBot?.id) : null);
    return await createBibleReadingSession(
      dataManager,
      loginManager,
      highlightsManager,
      id,
      { ...DEFAULT_SESSION_OPTIONS, hostUserId }
    );
  };

  const joinSession = async (id: string) => {
    return await createBibleReadingSession(
      dataManager,
      loginManager,
      highlightsManager,
      id
    );
  };

  return {
    createSession,
    joinSession,
  };
}
