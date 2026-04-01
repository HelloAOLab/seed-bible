import { effect, signal, type ReadonlySignal } from "@preact/signals";
import {
  createBibleReadingState,
  type BibleReadingState,
} from "seed-bible.managers.BibleReadingManager";
import type { BibleDataManager } from "seed-bible.managers.BibleDataManager";
import type { LoginManager } from "seed-bible.managers.LoginManager";

type UserProfile = Awaited<ReturnType<LoginManager["getUserProfile"]>>;

export interface ConnectedSessionUser {
  connectionId: string;
  sessionId: string | null;
  userId: string | null;
  profile: UserProfile | null;
}

interface SessionConnectionInfo {
  connectionId: string;
  sessionId: string | null;
  userId: string | null;
}

interface SessionRemoteClientEvent {
  type: "client_connected" | "client_disconnected";
  client: SessionConnectionInfo;
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
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  dataManager: BibleDataManager,
  loginManager: LoginManager,
  id: string
): Promise<BibleReadingSession> {
  const readingState = createBibleReadingState(dataManager);
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

        return {
          connectionId: client.connectionId,
          sessionId: client.sessionId,
          userId: client.userId,
          profile,
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
    (event: SessionRemoteClientEvent) => {
      if (event.type === "client_connected") {
        connectedClients.set(event.client.connectionId, event.client);
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
  loginManager: LoginManager
): SessionsManager {
  const createSession = async () => {
    const id = createSessionId();
    return await createBibleReadingSession(dataManager, loginManager, id);
  };

  const joinSession = async (id: string) => {
    return await createBibleReadingSession(dataManager, loginManager, id);
  };

  return {
    createSession,
    joinSession,
  };
}
