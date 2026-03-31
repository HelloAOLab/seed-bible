import { signal } from "@preact/signals";
import {
  createSessionsManager,
  type BibleReadingSession,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { createBibleReadingState } from "seed-bible.managers.BibleReadingManager";

jest.mock("seed-bible.managers.BibleReadingManager", () => ({
  createBibleReadingState: jest.fn(),
}));

type MockChangesSubscriber = () => void;

function createMockSharedMap(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  const subscribers = new Set<MockChangesSubscriber>();
  let emitOnSet = false;

  const map = {
    get: jest.fn((key: string) => store.get(key)),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
      if (emitOnSet) {
        for (const subscriber of subscribers) {
          subscriber();
        }
      }
    }),
    changes: {
      subscribe: jest.fn((handler: MockChangesSubscriber) => {
        subscribers.add(handler);
        return {
          unsubscribe: () => subscribers.delete(handler),
        };
      }),
    },
    emitChange: () => {
      for (const subscriber of subscribers) {
        subscriber();
      }
    },
    setEmitOnSet: (enabled: boolean) => {
      emitOnSet = enabled;
    },
  };

  return map;
}

function createMockReadingState() {
  return {
    translationId: signal<string | null>("BSB"),
    bookId: signal<string | null>("GEN"),
    chapterNumber: signal<number>(1),
  } as any;
}

describe("SessionsManager", () => {
  let getSharedDocumentMock: jest.Mock;
  let mockMap: ReturnType<typeof createMockSharedMap>;
  let mockDocument: {
    getMap: jest.Mock;
    transact: jest.Mock;
    unsubscribe: jest.Mock;
  };

  beforeEach(() => {
    mockMap = createMockSharedMap();
    mockDocument = {
      getMap: jest.fn().mockReturnValue(mockMap),
      transact: jest.fn((callback: () => void) => callback()),
      unsubscribe: jest.fn(),
    };

    getSharedDocumentMock = jest.fn().mockResolvedValue(mockDocument);
    (globalThis as any).os = {
      getSharedDocument: getSharedDocumentMock,
    };

    (createBibleReadingState as jest.Mock).mockImplementation(() =>
      createMockReadingState()
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("createSession() creates a session with a UUID and loads session_data in a public inst", async () => {
    const randomUUID = jest.fn().mockReturnValue("session-123");
    (globalThis as any).crypto = { randomUUID };

    const manager = createSessionsManager({} as any);
    const session = await manager.createSession();

    expect(randomUUID).toHaveBeenCalled();
    expect(getSharedDocumentMock).toHaveBeenCalledWith(
      null,
      "session-123",
      "session_data"
    );
    expect(session.id).toBe("session-123");
  });

  it("joinSession(id) loads and returns a session with the given ID", async () => {
    const manager = createSessionsManager({} as any);
    const session = await manager.joinSession("group-abc");

    expect(getSharedDocumentMock).toHaveBeenCalledWith(
      null,
      "group-abc",
      "session_data"
    );
    expect(session.id).toBe("group-abc");
  });

  it("loads existing reading state from the shared document", async () => {
    mockMap = createMockSharedMap({
      translationId: "NIV",
      bookId: "EXO",
      chapterNumber: 4,
    });
    mockDocument.getMap.mockReturnValue(mockMap);

    const manager = createSessionsManager({} as any);
    const session = await manager.joinSession("group-abc");

    expect(session.readingState.translationId.value).toBe("NIV");
    expect(session.readingState.bookId.value).toBe("EXO");
    expect(session.readingState.chapterNumber.value).toBe(4);
  });

  it("syncs reading state changes to the shared document", async () => {
    const manager = createSessionsManager({} as any);
    const session = await manager.joinSession("group-abc");

    session.readingState.translationId.value = "NIV";
    session.readingState.bookId.value = "EXO";
    session.readingState.chapterNumber.value = 8;

    expect(mockMap.set).toHaveBeenCalledWith("translationId", "NIV");
    expect(mockMap.set).toHaveBeenCalledWith("bookId", "EXO");
    expect(mockMap.set).toHaveBeenCalledWith("chapterNumber", 8);
    expect(mockDocument.transact).toHaveBeenCalled();
  });

  it("does not loop when local state changes are echoed back from the shared map", async () => {
    mockMap.setEmitOnSet(true);

    const manager = createSessionsManager({} as any);
    const session = await manager.joinSession("group-abc");

    mockMap.set.mockClear();
    mockDocument.transact.mockClear();

    session.readingState.translationId.value = "NIV";
    session.readingState.bookId.value = "EXO";
    session.readingState.chapterNumber.value = 8;

    expect(mockMap.set).toHaveBeenCalledTimes(3);
    expect(mockDocument.transact).toHaveBeenCalledTimes(3);
    expect(session.readingState.translationId.value).toBe("NIV");
    expect(session.readingState.bookId.value).toBe("EXO");
    expect(session.readingState.chapterNumber.value).toBe(8);
  });

  it("applies shared document changes to the session reading state", async () => {
    const manager = createSessionsManager({} as any);
    const session = (await manager.joinSession(
      "group-abc"
    )) as BibleReadingSession;

    mockMap.get.mockImplementation((key: string) => {
      if (key === "translationId") {
        return "ESV";
      }
      if (key === "bookId") {
        return "PSA";
      }
      if (key === "chapterNumber") {
        return 23;
      }
      return null;
    });

    mockMap.emitChange();

    expect(session.readingState.translationId.value).toBe("ESV");
    expect(session.readingState.bookId.value).toBe("PSA");
    expect(session.readingState.chapterNumber.value).toBe(23);
  });

  it("dispose() unsubscribes from the shared document", async () => {
    const manager = createSessionsManager({} as any);
    const session = await manager.joinSession("group-abc");

    session.dispose();

    expect(mockDocument.unsubscribe).toHaveBeenCalled();
  });
});
