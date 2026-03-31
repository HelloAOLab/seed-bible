import { effect } from "@preact/signals";
import {
  createBibleReadingState,
  type BibleReadingState,
} from "seed-bible.managers.BibleReadingManager";
import type { BibleDataManager } from "seed-bible.managers.BibleDataManager";

interface SessionData {
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number;
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

async function createBibleReadingSession(
  dataManager: BibleDataManager,
  id: string
): Promise<BibleReadingSession> {
  const readingState = createBibleReadingState(dataManager);
  const document = await os.getSharedDocument(null, id, "session_data");
  const stateMap =
    document.getMap<SessionData[keyof SessionData]>("reading_state");

  const existingTranslationId = toStringOrNull(stateMap.get("translationId"));
  const existingBookId = toStringOrNull(stateMap.get("bookId"));
  const existingChapterNumber = toPositiveIntOrDefault(
    stateMap.get("chapterNumber"),
    readingState.chapterNumber.value
  );

  if (existingTranslationId !== null) {
    readingState.translationId.value = existingTranslationId;
  }
  if (existingBookId !== null) {
    readingState.bookId.value = existingBookId;
  }
  readingState.chapterNumber.value = existingChapterNumber;

  let applyingRemoteState = false;

  const mapSubscription = stateMap.changes.subscribe(() => {
    applyingRemoteState = true;
    try {
      const nextTranslationId = toStringOrNull(stateMap.get("translationId"));
      const nextBookId = toStringOrNull(stateMap.get("bookId"));
      const nextChapterNumber = toPositiveIntOrDefault(
        stateMap.get("chapterNumber"),
        readingState.chapterNumber.value
      );

      if (nextTranslationId !== null) {
        readingState.translationId.value = nextTranslationId;
      }
      if (nextBookId !== null) {
        readingState.bookId.value = nextBookId;
      }
      readingState.chapterNumber.value = nextChapterNumber;
    } finally {
      applyingRemoteState = false;
    }
  });

  const stopSync = effect(() => {
    if (applyingRemoteState) {
      return;
    }

    const translationId = readingState.translationId.value;
    const bookId = readingState.bookId.value;
    const chapterNumber = readingState.chapterNumber.value;

    if (stateMap.get("translationId") !== translationId) {
      stateMap.set("translationId", translationId);
    }
    if (stateMap.get("bookId") !== bookId) {
      stateMap.set("bookId", bookId);
    }
    if (stateMap.get("chapterNumber") !== chapterNumber) {
      stateMap.set("chapterNumber", chapterNumber);
    }
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
