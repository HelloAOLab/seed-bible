import { signal } from "@preact/signals";
import {
  createSessionsManager,
  type BibleReadingSession,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { createBibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

jest.mock("seed-bible.managers.BibleReadingManager", () => ({
  createBibleReadingState: jest.fn(),
}));

type MockChangesSubscriber = () => void;
type TestRemoteClientEvent = {
  type: "client_connected" | "client_disconnected";
  isSelf: boolean;
  client: {
    connectionId: string;
    sessionId: string | null;
    userId: string | null;
  };
};
type MockRemoteClientSubscriber = (event: TestRemoteClientEvent) => void;

function createMockRemoteClientsObservable() {
  const subscribers = new Set<MockRemoteClientSubscriber>();

  return {
    subscribe: jest.fn((handler: MockRemoteClientSubscriber) => {
      subscribers.add(handler);
      return {
        unsubscribe: () => subscribers.delete(handler),
      };
    }),
    emit: (event: TestRemoteClientEvent) => {
      for (const subscriber of subscribers) {
        subscriber(event);
      }
    },
  };
}

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
  const translationId = signal<string | null>("BSB");
  const bookId = signal<string | null>("GEN");
  const chapterNumber = signal<number>(1);
  const chapterData = signal<any>(null);

  return {
    translationId,
    bookId,
    chapterNumber,
    chapterData,
    translationBooks: signal<any>(null),
    loading: signal<boolean>(false),
    error: signal<string | null>(null),
    selectTranslationAndChapter: jest.fn(
      async (
        nextTranslationId: string,
        nextBookId: string,
        nextChapterNumber: number
      ) => {
        translationId.value = nextTranslationId;
        bookId.value = nextBookId;
        chapterNumber.value = nextChapterNumber;
        chapterData.value = createMockChapterData(
          nextTranslationId,
          nextBookId,
          nextChapterNumber
        );
      }
    ),
  } as any;
}

function createMockChapterData(
  translationId: string,
  bookId: string,
  chapterNumber: number
): TranslationBookChapter {
  return {
    translation: {
      id: translationId,
      name: `${translationId} Name`,
      textDirection: "ltr",
    },
    book: {
      id: bookId,
      name: `${bookId} Name`,
      abbreviation: bookId,
    },
    chapter: {
      number: chapterNumber,
      id: `${bookId}-${chapterNumber}`,
      reference: `${bookId} ${chapterNumber}`,
      content: [],
      footnotes: [],
    },
    verses: [],
    notes: [],
  } as any;
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("SessionsManager", () => {
  let getSharedDocumentMock: jest.Mock;
  let mockMap: ReturnType<typeof createMockSharedMap>;
  let mockRemoteClients: ReturnType<typeof createMockRemoteClientsObservable>;
  let mockDocument: {
    getMap: jest.Mock;
    transact: jest.Mock;
    unsubscribe: jest.Mock;
    remoteClients: {
      subscribe: jest.Mock;
    };
  };
  let mockDataManager: Record<string, never>;
  let mockLoginManager: {
    getUserProfile: jest.Mock;
  };
  let mockHighlightsManager: {
    getChapterHighlights: jest.Mock;
  };

  beforeEach(() => {
    mockMap = createMockSharedMap();
    mockRemoteClients = createMockRemoteClientsObservable();
    mockDocument = {
      getMap: jest.fn().mockReturnValue(mockMap),
      transact: jest.fn((callback: () => void) => callback()),
      unsubscribe: jest.fn(),
      remoteClients: {
        subscribe: mockRemoteClients.subscribe,
      },
    };

    getSharedDocumentMock = jest.fn().mockResolvedValue(mockDocument);
    mockDataManager = {};
    mockLoginManager = {
      getUserProfile: jest.fn(async (userId: string) => ({
        name: `Profile ${userId}`,
      })),
    };
    mockHighlightsManager = {
      getChapterHighlights: jest.fn().mockResolvedValue({ highlights: [] }),
    };

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

    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
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
    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
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

    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
    const session = await manager.joinSession("group-abc");

    expect(
      session.readingState.selectTranslationAndChapter
    ).toHaveBeenCalledWith("NIV", "EXO", 4);

    expect(session.readingState.translationId.value).toBe("NIV");
    expect(session.readingState.bookId.value).toBe("EXO");
    expect(session.readingState.chapterNumber.value).toBe(4);
  });

  it("syncs reading state changes to the shared document", async () => {
    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
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

    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
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
    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
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

    await waitFor(
      () =>
        session.readingState.chapterData.value?.book?.id === "PSA" &&
        session.readingState.chapterData.value?.chapter?.number === 23
    );

    expect(session.readingState.translationId.value).toBe("ESV");
    expect(session.readingState.bookId.value).toBe("PSA");
    expect(session.readingState.chapterNumber.value).toBe(23);
  });

  it("keeps local selection when user changes chapter during remote sync", async () => {
    const chapterDeferred = deferred<any>();

    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
    const session = await manager.joinSession("group-abc");
    (
      session.readingState.selectTranslationAndChapter as jest.Mock
    ).mockReturnValue(chapterDeferred.promise);

    mockMap.get.mockImplementation((key: string) => {
      if (key === "translationId") return "ESV";
      if (key === "bookId") return "MAT";
      if (key === "chapterNumber") return 5;
      return null;
    });
    mockMap.emitChange();

    session.readingState.translationId.value = "NIV";
    session.readingState.bookId.value = "JHN";
    session.readingState.chapterNumber.value = 3;

    chapterDeferred.resolve(createMockChapterData("ESV", "MAT", 5));
    await chapterDeferred.promise;

    await waitFor(
      () =>
        mockMap.set.mock.calls.some(
          (call) => call[0] === "translationId" && call[1] === "NIV"
        ) && session.readingState.translationId.value === "NIV"
    );

    expect(session.readingState.translationId.value).toBe("NIV");
    expect(session.readingState.bookId.value).toBe("JHN");
    expect(session.readingState.chapterNumber.value).toBe(3);
  });

  it("applies only the latest remote sync when requests finish out of order", async () => {
    const chapterDeferred1 = deferred<any>();
    const chapterDeferred2 = deferred<any>();

    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
    const session = await manager.joinSession("group-abc");
    (session.readingState.selectTranslationAndChapter as jest.Mock)
      .mockImplementationOnce(async () => {
        await chapterDeferred1.promise;
        session.readingState.translationId.value = "ESV";
        session.readingState.bookId.value = "MAT";
        session.readingState.chapterNumber.value = 1;
        session.readingState.chapterData.value = createMockChapterData(
          "ESV",
          "MAT",
          1
        );
      })
      .mockImplementationOnce(async () => {
        await chapterDeferred2.promise;
        session.readingState.translationId.value = "ESV";
        session.readingState.bookId.value = "MAT";
        session.readingState.chapterNumber.value = 2;
        session.readingState.chapterData.value = createMockChapterData(
          "ESV",
          "MAT",
          2
        );
      })
      .mockImplementation(
        async (
          nextTranslationId: string,
          nextBookId: string,
          nextChapterNumber: number
        ) => {
          session.readingState.translationId.value = nextTranslationId;
          session.readingState.bookId.value = nextBookId;
          session.readingState.chapterNumber.value = nextChapterNumber;
          session.readingState.chapterData.value = createMockChapterData(
            nextTranslationId,
            nextBookId,
            nextChapterNumber
          );
        }
      );

    mockMap.get.mockImplementation((key: string) => {
      if (key === "translationId") return "ESV";
      if (key === "bookId") return "MAT";
      if (key === "chapterNumber") return 1;
      return null;
    });
    mockMap.emitChange();

    mockMap.get.mockImplementation((key: string) => {
      if (key === "translationId") return "ESV";
      if (key === "bookId") return "MAT";
      if (key === "chapterNumber") return 2;
      return null;
    });
    mockMap.emitChange();

    chapterDeferred2.resolve(createMockChapterData("ESV", "MAT", 2));
    await chapterDeferred2.promise;

    await waitFor(
      () => session.readingState.chapterData.value?.chapter?.number === 2
    );

    chapterDeferred1.resolve(createMockChapterData("ESV", "MAT", 1));
    await chapterDeferred1.promise;

    await waitFor(
      () => session.readingState.chapterData.value?.chapter?.number === 2
    );

    expect(session.readingState.chapterNumber.value).toBe(2);
    expect(session.readingState.chapterData.value?.chapter?.number).toBe(2);
  });

  it("dispose() unsubscribes from the shared document", async () => {
    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
    const session = await manager.joinSession("group-abc");

    session.dispose();

    expect(mockDocument.unsubscribe).toHaveBeenCalled();
  });

  it("tracks connected users from remoteClients and loads profiles for authenticated users", async () => {
    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
    const session = await manager.joinSession("group-abc");

    mockRemoteClients.emit({
      type: "client_connected",
      isSelf: false,
      client: {
        connectionId: "conn-1",
        sessionId: "group-abc",
        userId: "user-1",
      },
    });

    mockRemoteClients.emit({
      type: "client_connected",
      isSelf: false,
      client: {
        connectionId: "conn-2",
        sessionId: "group-abc",
        userId: null,
      },
    });

    await waitFor(() => session.connectedUsers.value.length === 2);

    expect(mockLoginManager.getUserProfile).toHaveBeenCalledWith("user-1");
    expect(session.connectedUsers.value).toEqual(
      expect.arrayContaining([
        {
          connectionId: "conn-1",
          sessionId: "group-abc",
          userId: "user-1",
          profile: {
            name: "Profile user-1",
          },
          isSelf: false,
          color: expect.any(String),
        },
        {
          connectionId: "conn-2",
          sessionId: "group-abc",
          userId: null,
          profile: null,
          isSelf: false,
          color: expect.any(String),
        },
      ])
    );
  });

  it("removes disconnected users from the connected users list", async () => {
    const manager = createSessionsManager(
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any
    );
    const session = await manager.joinSession("group-abc");

    mockRemoteClients.emit({
      type: "client_connected",
      isSelf: false,
      client: {
        connectionId: "conn-1",
        sessionId: "group-abc",
        userId: "user-1",
      },
    });

    await waitFor(() => session.connectedUsers.value.length === 1);

    mockRemoteClients.emit({
      type: "client_disconnected",
      isSelf: false,
      client: {
        connectionId: "conn-1",
        sessionId: "group-abc",
        userId: "user-1",
      },
    });

    await waitFor(() => session.connectedUsers.value.length === 0);
  });
});
