import { effect, signal, type ReadonlySignal } from "@preact/signals";
import {
  createBibleReadingState,
  type BibleReadingState,
} from "seed-bible.managers.BibleReadingManager";
import type { HighlightsManager } from "seed-bible.managers.HighlightsManager";
import type { BibleDataManager } from "seed-bible.managers.BibleDataManager";
import type {
  LoginManager,
  UserProfile,
} from "seed-bible.managers.LoginManager";

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

export interface SessionConnectionInfo extends ConnectionInfo {
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
}

function getSessionDataSnapshot(
  readingState: Pick<
    BibleReadingState,
    "translationId" | "bookId" | "chapterNumber"
  >
): SessionData {
  return {
    translationId: readingState.translationId.value,
    bookId: readingState.bookId.value,
    chapterNumber: readingState.chapterNumber.value,
  };
}

function getSessionDataFromMap(
  stateMap: SharedMap<SessionData[keyof SessionData]>
): SessionData {
  return {
    translationId: toStringOrNull(stateMap.get("translationId")),
    bookId: toStringOrNull(stateMap.get("bookId")),
    chapterNumber: toPositiveIntOrNull(stateMap.get("chapterNumber")),
  };
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
    "translationId" | "bookId" | "chapterNumber"
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
}

function canLoadSessionData(sessionData: SessionData): sessionData is {
  translationId: string;
  bookId: string;
  chapterNumber: number;
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
  readingState: BibleReadingState;
  connectedUsers: ReadonlySignal<ConnectedSessionUser[]>;
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
  id: string
): Promise<BibleReadingSession> {
  const readingState = createBibleReadingState(dataManager, highlightsManager);
  const document = await os.getSharedDocument(null, id, "session_data");
  const stateMap =
    document.getMap<SessionData[keyof SessionData]>("reading_state");
  const connectedUsers = signal<ConnectedSessionUser[]>([]);
  const connectedClients = new Map<string, SessionConnectionInfo>();
  const profileCache = new Map<string, UserProfile>();

  let applyingRemoteState = false;
  let lastLocallyWrittenState: SessionData | null = null;
  let syncVersion = 0;
  let pendingRemoteTarget: SessionData | null = null;
  let remoteClientsVersion = 0;

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
      await readingState.selectTranslationAndChapter(
        sessionData.translationId,
        sessionData.bookId,
        sessionData.chapterNumber
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
    });
  });

  const dispose = () => {
    mapSubscription.unsubscribe();
    remoteClientsSubscription.unsubscribe();
    stopSync();
    document.unsubscribe();
  };

  return {
    id,
    document,
    readingState,
    connectedUsers,
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
    return await createBibleReadingSession(
      dataManager,
      loginManager,
      highlightsManager,
      id
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
