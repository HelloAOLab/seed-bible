import { effect } from "@preact/signals";
import {
  createBibleReadingState,
  type BibleReadingState,
} from "seed-bible.managers.BibleReadingManager";
import type { BibleDataManager } from "seed-bible.managers.BibleDataManager";

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

export interface BibleReadingSession {
  id: string;
  document: SharedDocument;
  readingState: BibleReadingState;
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

function toPositiveIntOrDefault(value: unknown, defaultValue: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : defaultValue;
}

function toPositiveIntOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

async function createBibleReadingSession(
  dataManager: BibleDataManager,
  id: string
): Promise<BibleReadingSession> {
  const readingState = createBibleReadingState(dataManager);
  const document = await os.getSharedDocument(null, id, "session_data");
  const stateMap =
    document.getMap<SessionData[keyof SessionData]>("reading_state");

  applySessionDataToReadingState(readingState, getSessionDataFromMap(stateMap));

  let applyingRemoteState = false;
  let lastLocallyWrittenState: SessionData | null = null;

  const mapSubscription = stateMap.changes.subscribe(() => {
    const nextSessionData = getSessionDataFromMap(stateMap);

    if (
      lastLocallyWrittenState &&
      sessionDataMatches(nextSessionData, lastLocallyWrittenState)
    ) {
      lastLocallyWrittenState = null;
      return;
    }

    applyingRemoteState = true;
    try {
      applySessionDataToReadingState(readingState, nextSessionData);
    } finally {
      applyingRemoteState = false;
    }
  });

  const stopSync = effect(() => {
    if (applyingRemoteState) {
      return;
    }

    const nextSessionData = getSessionDataSnapshot(readingState);
    const currentSessionData = getSessionDataFromMap(stateMap);

    if (sessionDataMatches(nextSessionData, currentSessionData)) {
      return;
    }

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
    stopSync();
    document.unsubscribe();
  };

  return {
    id,
    document,
    readingState,
    dispose,
  };
}

export interface SessionsManager {
  createSession: () => Promise<BibleReadingSession>;
  joinSession: (id: string) => Promise<BibleReadingSession>;
}

export function createSessionsManager(
  dataManager: BibleDataManager
): SessionsManager {
  const createSession = async () => {
    const id = createSessionId();
    return await createBibleReadingSession(dataManager, id);
  };

  const joinSession = async (id: string) => {
    return await createBibleReadingSession(dataManager, id);
  };

  return {
    createSession,
    joinSession,
  };
}
