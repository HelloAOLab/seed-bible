import { batch, signal } from "@preact/signals";
import {
  createSessionsManager,
  getUserAnimalVisual,
  type BibleReadingSession,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { createBibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type {
  VerseDecoration,
  VerseDecorationInput,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { Mock } from "vitest";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import {
  createI18nManager,
  type I18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createBibleReadingExtensionManager } from "@packages/seed-bible/seed-bible/managers/BibleReadingExtensionManager";

vi.mock("@packages/seed-bible/seed-bible/managers/BibleReadingManager", () => ({
  createBibleReadingState: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(),
}));

type MockChangesSubscriber = () => void;
type TestRemoteClientEvent = {
  type: "client_connected" | "client_disconnected";
  isSelf: boolean;
  client: {
    connectionId: string;
    userId: string | null;
  };
};
type MockRemoteClientSubscriber = (event: TestRemoteClientEvent) => void;

function createMockRemoteClientsObservable() {
  const subscribers = new Set<MockRemoteClientSubscriber>();

  return {
    subscribe: vi.fn((handler: MockRemoteClientSubscriber) => {
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

function createMockStatusUpdatedObservable() {
  const subscribers = new Set<
    (status: { type: string; synced?: boolean }) => void
  >();

  return {
    subscribe: vi.fn(
      (handler: (status: { type: string; synced?: boolean }) => void) => {
        subscribers.add(handler);
        return {
          unsubscribe: () => subscribers.delete(handler),
        };
      }
    ),
    emit: (status: { type: string; synced?: boolean }) => {
      for (const subscriber of subscribers) {
        subscriber(status);
      }
    },
  };
}

function createMockSharedMap(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  const subscribers = new Set<MockChangesSubscriber>();
  let emitOnSet = false;

  const map = {
    get: vi.fn((key: string) => store.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
      if (emitOnSet) {
        for (const subscriber of subscribers) {
          subscriber();
        }
      }
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      if (emitOnSet) {
        for (const subscriber of subscribers) {
          subscriber();
        }
      }
    }),
    forEach: vi.fn(
      (callback: (value: unknown, key: string, map: unknown) => void) => {
        for (const [key, value] of store.entries()) {
          callback(value, key, map);
        }
      }
    ),
    changes: {
      subscribe: vi.fn((handler: MockChangesSubscriber) => {
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
  const scrollToVerse = signal<number | null>(null);
  const chapterData = signal<any>(null);
  const decorations = signal<VerseDecoration[]>([]);

  const decorateVerses = vi.fn(
    (
      nextBookId: string,
      nextChapterNumber: number,
      verses: number | number[],
      decoration: VerseDecorationInput,
      id: string = `decoration-${Math.random()}`
    ) => {
      const verseNumbers = Array.isArray(verses) ? verses : [verses];
      const nextDecoration: VerseDecoration = {
        id,
        bookId: nextBookId,
        chapterNumber: nextChapterNumber,
        verses: verseNumbers,
        ...decoration,
        translationId: decoration.translationId ?? null,
      };

      decorations.value = [
        ...decorations.value.filter((item) => item.id !== id),
        nextDecoration,
      ];

      return id;
    }
  );

  const removeDecoration = vi.fn((decorationId: string) => {
    decorations.value = decorations.value.filter(
      (decoration) => decoration.id !== decorationId
    );
  });

  const enabledExtensions = signal<any[]>([]);
  const enableExtension = vi.fn((id: string, data?: unknown) => {
    const existing = enabledExtensions.value.find(
      (runtime) => runtime.id === id
    );
    if (existing) {
      existing.data.value = data;
      return;
    }
    enabledExtensions.value = [
      ...enabledExtensions.value,
      { id, data: signal(data) },
    ];
  });
  const disableExtension = vi.fn((id: string) => {
    enabledExtensions.value = enabledExtensions.value.filter(
      (runtime) => runtime.id !== id
    );
  });

  return {
    translationId,
    bookId,
    chapterNumber,
    scrollToVerse,
    chapterData,
    decorations,
    translationBooks: signal<any>(null),
    loading: signal<boolean>(false),
    error: signal<string | null>(null),
    decorateVerses,
    removeDecoration,
    enabledExtensions,
    enableExtension,
    disableExtension,
    isExtensionEnabled: (id: string) =>
      enabledExtensions.value.some((runtime) => runtime.id === id),
    selectTranslationAndChapter: vi.fn(
      async (
        nextTranslationId: string,
        nextBookId: string,
        nextChapterNumber: number,
        options?: {
          scrollToVerse?: number;
        }
      ) => {
        translationId.value = nextTranslationId;
        bookId.value = nextBookId;
        chapterNumber.value = nextChapterNumber;
        scrollToVerse.value = options?.scrollToVerse ?? null;
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
  let getSharedDocumentMock: Mock;
  let mockMap: ReturnType<typeof createMockSharedMap>;
  let mockOptionsMap: ReturnType<typeof createMockSharedMap>;
  let mockDecorationsMap: ReturnType<typeof createMockSharedMap>;
  let mockRemoteClients: ReturnType<typeof createMockRemoteClientsObservable>;
  let mockStatusUpdated: ReturnType<typeof createMockStatusUpdatedObservable>;
  let mockDocument: {
    getMap: Mock;
    transact: Mock;
    unsubscribe: Mock;
    remoteClients: {
      subscribe: Mock;
    };
    onStatusUpdated: {
      subscribe: Mock;
    };
  };
  let mockDataManager: Record<string, never>;
  let mockLoginManager: {
    getUserProfile: Mock;
    userId: ReturnType<typeof signal<string | null>>;
    profile: ReturnType<typeof signal<UserProfile | null>>;
  };
  let mockUserProfilesMap: ReturnType<typeof createMockSharedMap>;
  let mockExtensionsMap: ReturnType<typeof createMockSharedMap>;
  let mockHighlightsManager: {
    getChapterHighlights: Mock;
  };
  let uuidCount = 0;
  let uuid: Mock;
  let i18n: I18nManager;

  let os: CasualOSManager;

  beforeEach(async () => {
    const { v4: uuidMock } = await vi.importMock("uuid");
    uuid = uuidMock as Mock;
    uuid.mockImplementation(() => `uuid-${uuidCount++}`);
    uuid.mockReturnValueOnce("test-config-bot-id");

    os = CasualOSManager();
    mockMap = createMockSharedMap();
    mockOptionsMap = createMockSharedMap();
    mockDecorationsMap = createMockSharedMap();
    mockUserProfilesMap = createMockSharedMap();
    mockExtensionsMap = createMockSharedMap();
    mockRemoteClients = createMockRemoteClientsObservable();
    mockStatusUpdated = createMockStatusUpdatedObservable();
    mockDocument = {
      getMap: vi.fn((name: string) => {
        if (name === "options") {
          return mockOptionsMap;
        }

        if (name === "decorations") {
          return mockDecorationsMap;
        }

        if (name === "user_profiles") {
          return mockUserProfilesMap;
        }

        if (name === "reading_extensions") {
          return mockExtensionsMap;
        }

        return mockMap;
      }),
      transact: vi.fn((callback: () => void) => callback()),
      unsubscribe: vi.fn(),
      remoteClients: {
        subscribe: mockRemoteClients.subscribe,
      },
      onStatusUpdated: {
        subscribe: mockStatusUpdated.subscribe,
      },
    };

    getSharedDocumentMock = vi
      .spyOn(os, "getSharedDocument")
      .mockResolvedValue(mockDocument as unknown as SharedDocument);
    mockDataManager = {};
    mockLoginManager = {
      getUserProfile: vi.fn(async (userId: string) => ({
        name: `Profile ${userId}`,
      })),
      userId: signal<string | null>(null),
      profile: signal<UserProfile | null>(null),
    };
    mockHighlightsManager = {
      getChapterHighlights: vi.fn().mockReturnValue(signal({ highlights: [] })),
    };
    i18n = createI18nManager(createNavigationManager(), ["en"]);

    (createBibleReadingState as Mock).mockImplementation(() =>
      createMockReadingState()
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("createSession() creates a session with a UUID and loads session_data in a public inst", async () => {
    uuid.mockReturnValueOnce("123");
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.createSession();

    // expect(spy).toHaveBeenCalled();
    expect(getSharedDocumentMock).toHaveBeenCalledWith(
      null,
      "session-123",
      "session_data"
    );
    expect(session.id).toBe("session-123");
  });

  it("createSession() stores the default session options in the options map", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );

    const session = await manager.createSession();

    expect(mockDocument.getMap).toHaveBeenCalledWith("options");
    expect(mockOptionsMap.set).toHaveBeenCalledWith("allowedNavigators", null);
    expect(mockOptionsMap.set).toHaveBeenCalledWith("allowedDecorators", null);
    expect(session.options.value).toEqual({
      allowedNavigators: null,
      allowedDecorators: null,
      hostUserId: "test-config-bot-id",
      highlightDurationSeconds: 16,
      endedAt: null,
      shareTranslation: false,
      coHostUserIds: [],
    });
  });

  it("joinSession(id) loads and returns a session with the given ID", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    expect(getSharedDocumentMock).toHaveBeenCalledWith(
      null,
      "group-abc",
      "session_data"
    );
    expect(session.id).toBe("group-abc");
  });

  it("joinSession(id) does not set default options in the options map", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );

    const session = await manager.joinSession("group-abc");

    expect(mockDocument.getMap).toHaveBeenCalledWith("options");
    expect(mockOptionsMap.set).not.toHaveBeenCalledWith(
      "allowedNavigators",
      null
    );
    expect(mockOptionsMap.set).not.toHaveBeenCalledWith(
      "allowedDecorators",
      null
    );
    expect(session.options.value).toEqual({
      allowedNavigators: null,
      allowedDecorators: null,
      hostUserId: null,
      highlightDurationSeconds: 16,
      endedAt: null,
      shareTranslation: false,
      coHostUserIds: [],
    });
  });

  it("joinSession(id) preserves existing options from the options map", async () => {
    mockOptionsMap = createMockSharedMap({
      allowedNavigators: ["user-1", "conn-2"],
    });
    mockDocument.getMap.mockImplementation((name: string) => {
      if (name === "options") {
        return mockOptionsMap;
      }

      return mockMap;
    });

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );

    const session = await manager.joinSession("group-abc");

    expect(session.options.value).toEqual({
      allowedNavigators: ["user-1", "conn-2"],
      allowedDecorators: null,
      hostUserId: null,
      highlightDurationSeconds: 16,
      endedAt: null,
      shareTranslation: false,
      coHostUserIds: [],
    });
    expect(mockOptionsMap.set).not.toHaveBeenCalled();
  });

  it("updates the options signal when the shared options map changes", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.get.mockImplementation((key: string) => {
      if (key === "allowedNavigators") {
        return ["user-1", "conn-2"];
      }

      return null;
    });

    mockOptionsMap.emitChange();

    await waitFor(
      () => session.options.value.allowedNavigators?.[0] === "user-1"
    );

    expect(session.options.value).toEqual({
      allowedNavigators: ["user-1", "conn-2"],
      allowedDecorators: null,
      hostUserId: null,
      highlightDurationSeconds: null,
      endedAt: null,
      shareTranslation: false,
      coHostUserIds: [],
    });
  });

  it("updateOptions(newOptions) writes options to the shared options map", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.setEmitOnSet(true);

    session.updateOptions({
      allowedNavigators: ["user-1", "conn-2"],
    });

    expect(mockOptionsMap.set).toHaveBeenCalledWith("allowedNavigators", [
      "user-1",
      "conn-2",
    ]);
    expect(session.options.value).toEqual({
      allowedNavigators: ["user-1", "conn-2"],
      allowedDecorators: null,
      hostUserId: null,
      highlightDurationSeconds: 16,
      endedAt: null,
      shareTranslation: false,
      coHostUserIds: [],
    });
  });

  it("does not sync reading state changes when the current user is not an allowed navigator", async () => {
    mockLoginManager.userId.value = "user-blocked";

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.setEmitOnSet(true);

    session.updateOptions({
      allowedNavigators: ["user-allowed", "conn-self"],
    });

    mockMap.set.mockClear();
    mockDocument.transact.mockClear();

    session.readingState.translationId.value = "NIV";
    session.readingState.bookId.value = "EXO";
    session.readingState.chapterNumber.value = 8;

    expect(mockMap.set).not.toHaveBeenCalled();
    expect(mockDocument.transact).not.toHaveBeenCalled();
  });

  it("does not sync reading state changes when the current connection is not an allowed navigator", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.setEmitOnSet(true);

    session.updateOptions({
      allowedNavigators: ["conn-allowed"],
    });

    mockMap.set.mockClear();
    mockDocument.transact.mockClear();

    session.readingState.translationId.value = "NIV";
    session.readingState.bookId.value = "EXO";
    session.readingState.chapterNumber.value = 8;

    expect(mockMap.set).not.toHaveBeenCalled();
    expect(mockDocument.transact).not.toHaveBeenCalled();
  });

  it("syncs local decorations to the shared decorations map", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.setEmitOnSet(true);

    session.readingState.decorateVerses(
      "GEN",
      1,
      [1, 2],
      {
        className: "remote-cursor",
        preserveOnChapterChange: true,
        translationId: "BSB",
      },
      "decoration-local"
    );

    await waitFor(() => mockDecorationsMap.set.mock.calls.length > 0);

    expect(mockDecorationsMap.set).toHaveBeenCalledWith(
      JSON.stringify(["test-config-bot-id", "decoration-local"]),
      expect.objectContaining({
        id: "decoration-local",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1, 2],
        className: "remote-cursor",
        preserveOnChapterChange: true,
      })
    );
  });

  it("syncs removeAfterMs for local decorations to the shared decorations map", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.setEmitOnSet(true);

    session.readingState.decorateVerses(
      "GEN",
      1,
      [5],
      {
        className: "temp-decoration",
        removeAfterMs: 1500,
      },
      "decoration-local-timeout"
    );

    await waitFor(() => mockDecorationsMap.set.mock.calls.length > 0);

    expect(mockDecorationsMap.set).toHaveBeenCalledWith(
      JSON.stringify(["test-config-bot-id", "decoration-local-timeout"]),
      expect.objectContaining({
        id: "decoration-local-timeout",
        removeAfterMs: 1500,
      })
    );
  });

  it("does not sync decoration changes when the current user is not an allowed decorator", async () => {
    mockLoginManager.userId.value = "user-blocked";

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.setEmitOnSet(true);
    session.updateOptions({
      allowedDecorators: ["user-allowed", "test-config-bot-id"],
    });

    mockDecorationsMap.set.mockClear();
    mockDecorationsMap.delete.mockClear();
    mockDocument.transact.mockClear();

    session.readingState.decorateVerses(
      "GEN",
      1,
      [1],
      {
        className: "blocked-local-decoration",
      },
      "decoration-blocked-user"
    );

    expect(mockDecorationsMap.set).not.toHaveBeenCalled();
    expect(mockDecorationsMap.delete).not.toHaveBeenCalled();
    expect(mockDocument.transact).not.toHaveBeenCalled();
  });

  it("does not sync decoration changes when the current connection is not an allowed decorator", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockOptionsMap.setEmitOnSet(true);
    session.updateOptions({
      allowedDecorators: ["conn-allowed"],
    });

    mockDecorationsMap.set.mockClear();
    mockDecorationsMap.delete.mockClear();
    mockDocument.transact.mockClear();

    session.readingState.decorateVerses(
      "GEN",
      1,
      [1],
      {
        className: "blocked-connection-decoration",
      },
      "decoration-blocked-connection"
    );

    expect(mockDecorationsMap.set).not.toHaveBeenCalled();
    expect(mockDecorationsMap.delete).not.toHaveBeenCalled();
    expect(mockDocument.transact).not.toHaveBeenCalled();
  });

  it("applies shared decorations from other users to the reading state", async () => {
    mockMap = createMockSharedMap({
      translationId: "BSB",
      bookId: "GEN",
      chapterNumber: 1,
    });

    const remoteDecoration: VerseDecoration = {
      id: "decoration-remote",
      translationId: "BSB",
      bookId: "GEN",
      chapterNumber: 1,
      verses: [3],
      className: "other-user-decoration",
    };

    mockDecorationsMap = createMockSharedMap({
      [JSON.stringify(["conn-other", "decoration-remote"])]: remoteDecoration,
    });
    mockDocument.getMap.mockImplementation((name: string) => {
      if (name === "options") {
        return mockOptionsMap;
      }

      if (name === "decorations") {
        return mockDecorationsMap;
      }

      return mockMap;
    });

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    await waitFor(() => session.readingState.decorations.value.length === 1);

    expect(session.readingState.decorations.value).toEqual([remoteDecoration]);
  });

  it("applies removeAfterMs from shared decorations", async () => {
    mockMap = createMockSharedMap({
      translationId: "BSB",
      bookId: "GEN",
      chapterNumber: 1,
    });

    const remoteDecoration: VerseDecoration = {
      id: "decoration-remote-timeout",
      translationId: "BSB",
      bookId: "GEN",
      chapterNumber: 1,
      verses: [4],
      className: "other-user-timeout-decoration",
      removeAfterMs: 2500,
    };

    mockDecorationsMap = createMockSharedMap({
      [JSON.stringify(["conn-other", "decoration-remote-timeout"])]:
        remoteDecoration,
    });
    mockDocument.getMap.mockImplementation((name: string) => {
      if (name === "options") {
        return mockOptionsMap;
      }

      if (name === "decorations") {
        return mockDecorationsMap;
      }

      return mockMap;
    });

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    await waitFor(() => session.readingState.decorations.value.length === 1);

    expect(session.readingState.decorations.value).toEqual([remoteDecoration]);
  });

  it("keeps decorations from different users in the shared document at the same time", async () => {
    mockMap = createMockSharedMap({
      translationId: "BSB",
      bookId: "GEN",
      chapterNumber: 1,
    });

    const remoteDecoration: VerseDecoration = {
      id: "decoration-remote",
      translationId: "BSB",
      bookId: "GEN",
      chapterNumber: 1,
      verses: [2],
      className: "remote-decoration",
    };

    mockDecorationsMap = createMockSharedMap({
      [JSON.stringify(["conn-other", "decoration-remote"])]: remoteDecoration,
    });
    mockDocument.getMap.mockImplementation((name: string) => {
      if (name === "options") {
        return mockOptionsMap;
      }

      if (name === "decorations") {
        return mockDecorationsMap;
      }

      return mockMap;
    });

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    session.readingState.decorateVerses(
      "GEN",
      1,
      [1],
      {
        className: "local-decoration",
      },
      "decoration-local"
    );

    await waitFor(
      () =>
        session.readingState.decorations.value.some(
          (decoration) => decoration.id === "decoration-remote"
        ) &&
        mockDecorationsMap.set.mock.calls.some(
          (call) =>
            call[0] ===
            JSON.stringify(["test-config-bot-id", "decoration-local"])
        )
    );

    expect(session.readingState.decorations.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "decoration-local" }),
        expect.objectContaining({ id: "decoration-remote" }),
      ])
    );
  });

  it("loads existing reading state from the shared document", async () => {
    mockMap = createMockSharedMap({
      translationId: "NIV",
      bookId: "EXO",
      chapterNumber: 4,
      // Translation only propagates when sharing is enabled.
      shareTranslation: true,
    });
    mockDocument.getMap.mockReturnValue(mockMap);

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    expect(
      session.readingState.selectTranslationAndChapter
    ).toHaveBeenCalledWith("NIV", "EXO", 4, undefined);

    expect(session.readingState.translationId.value).toBe("NIV");
    expect(session.readingState.bookId.value).toBe("EXO");
    expect(session.readingState.chapterNumber.value).toBe(4);
  });

  it("loads existing scrollToVerse from the shared document", async () => {
    mockMap = createMockSharedMap({
      translationId: "NIV",
      bookId: "EXO",
      chapterNumber: 4,
      scrollToVerse: 12,
      // Translation only propagates when sharing is enabled.
      shareTranslation: true,
    });
    mockDocument.getMap.mockReturnValue(mockMap);

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    expect(
      session.readingState.selectTranslationAndChapter
    ).toHaveBeenCalledWith("NIV", "EXO", 4, {
      scrollToVerse: 12,
    });
  });

  it("syncs reading state changes to the shared document", async () => {
    // Translation only propagates when sharing is enabled.
    mockOptionsMap.set("shareTranslation", true);
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    batch(() => {
      session.readingState.translationId.value = "NIV";
      session.readingState.bookId.value = "EXO";
      session.readingState.chapterNumber.value = 8;
      session.readingState.scrollToVerse.value = 6;
    });

    expect(mockMap.set).toHaveBeenCalledWith("translationId", "NIV");
    expect(mockMap.set).toHaveBeenCalledWith("bookId", "EXO");
    expect(mockMap.set).toHaveBeenCalledWith("chapterNumber", 8);
    expect(mockMap.set).toHaveBeenCalledWith("scrollToVerse", 6);
    expect(mockDocument.transact).toHaveBeenCalled();
  });

  it("does not update the shared document when only scrollToVerse changes", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockMap.set.mockClear();
    mockDocument.transact.mockClear();

    session.readingState.scrollToVerse.value = 9;

    expect(mockMap.set).not.toHaveBeenCalled();
    expect(mockDocument.transact).not.toHaveBeenCalled();
  });

  it("does not loop when local state changes are echoed back from the shared map", async () => {
    mockMap.setEmitOnSet(true);
    // Translation only propagates when sharing is enabled.
    mockOptionsMap.set("shareTranslation", true);

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
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
    // Translation only propagates when sharing is enabled.
    mockOptionsMap.set("shareTranslation", true);
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
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

  it("keeps the current reading state book when the shared session book ID is null", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = (await manager.joinSession(
      "group-abc"
    )) as BibleReadingSession;

    // The mock reading state starts on GEN.
    expect(session.readingState.bookId.value).toBe("GEN");

    // A peer publishes session data with no book (bookId null) but a new
    // chapter. Because the book is missing, canLoadSessionData() is false, so
    // the state is applied field-by-field instead of through a full chapter
    // load — this is the branch that falls back to the local book ID.
    mockMap.get.mockImplementation((key: string) => {
      if (key === "chapterNumber") {
        return 5;
      }
      // bookId (and everything else) is absent from the shared session.
      return null;
    });

    mockMap.emitChange();

    // The chapter change proves the fallback branch actually ran.
    await waitFor(() => session.readingState.chapterNumber.value === 5);

    // The book ID is null in the shared session, so it falls back to the
    // book the reader was already on rather than being cleared.
    expect(session.readingState.bookId.value).toBe("GEN");
  });

  it("keeps local selection when user changes chapter during remote sync", async () => {
    const chapterDeferred = deferred<any>();
    // Translation only propagates when sharing is enabled.
    mockOptionsMap.set("shareTranslation", true);

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");
    (session.readingState.selectTranslationAndChapter as Mock).mockReturnValue(
      chapterDeferred.promise
    );

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
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");
    (session.readingState.selectTranslationAndChapter as Mock)
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
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    session.dispose();

    expect(mockDocument.unsubscribe).toHaveBeenCalled();
  });

  it("isSynced starts true and tracks the document's sync status updates", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    // getSharedDocument() already awaited the first sync before resolving,
    // so a freshly joined session starts out trusted.
    expect(session.isSynced.value).toBe(true);

    mockStatusUpdated.emit({ type: "sync", synced: false });
    expect(session.isSynced.value).toBe(false);

    mockStatusUpdated.emit({ type: "sync", synced: true });
    expect(session.isSynced.value).toBe(true);

    // Other status message types (e.g. "connection") don't affect it.
    mockStatusUpdated.emit({ type: "connection" });
    expect(session.isSynced.value).toBe(true);
  });

  it("dispose() unsubscribes from the status-updated observable", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    session.dispose();
    mockStatusUpdated.emit({ type: "sync", synced: false });

    // The subscription was torn down by dispose(), so this emission after
    // teardown should not reach the (now-stale) signal.
    expect(session.isSynced.value).toBe(true);
  });

  it("tracks connected users from remoteClients and loads profiles for authenticated users", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockRemoteClients.emit({
      type: "client_connected",
      isSelf: false,
      client: {
        connectionId: "conn-1",
        userId: "user-1",
      },
    });

    mockRemoteClients.emit({
      type: "client_connected",
      isSelf: false,
      client: {
        connectionId: "conn-2",
        userId: null,
      },
    });

    await waitFor(() => session.connectedUsers.value.length === 2);

    expect(mockLoginManager.getUserProfile).toHaveBeenCalledWith("user-1");
    expect(session.connectedUsers.value).toEqual(
      expect.arrayContaining([
        {
          connectionId: "conn-1",
          userId: "user-1",
          profile: {
            name: "Profile user-1",
          },
          isSelf: false,
          isActive: true,
          visual: getUserAnimalVisual("conn-1"),
          joinedAtMs: null,
        },
        {
          connectionId: "conn-2",
          userId: null,
          profile: null,
          isSelf: false,
          isActive: true,
          visual: getUserAnimalVisual("conn-2"),
          joinedAtMs: null,
        },
      ])
    );

    expect(session.allUsers.value).toEqual(
      expect.arrayContaining([
        {
          connectionId: "conn-1",
          userId: "user-1",
          profile: {
            name: "Profile user-1",
          },
          isSelf: false,
          isActive: true,
          visual: getUserAnimalVisual("conn-1"),
          joinedAtMs: null,
        },
        {
          connectionId: "conn-2",
          userId: null,
          profile: null,
          isSelf: false,
          isActive: true,
          visual: getUserAnimalVisual("conn-2"),
          joinedAtMs: null,
        },
      ])
    );
  });

  it("removes disconnected users from the connected users list", async () => {
    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    mockRemoteClients.emit({
      type: "client_connected",
      isSelf: false,
      client: {
        connectionId: "conn-1",
        userId: "user-1",
      },
    });

    await waitFor(() => session.connectedUsers.value.length === 1);

    mockRemoteClients.emit({
      type: "client_disconnected",
      isSelf: false,
      client: {
        connectionId: "conn-1",
        userId: "user-1",
      },
    });

    await waitFor(() => session.connectedUsers.value.length === 0);

    expect(session.allUsers.value).toEqual(
      expect.arrayContaining([
        {
          connectionId: "conn-1",
          userId: "user-1",
          profile: {
            name: "Profile user-1",
          },
          isSelf: false,
          isActive: false,
          visual: getUserAnimalVisual("conn-1"),
          joinedAtMs: null,
        },
      ])
    );
  });

  it("joins with inactive users seeded from user_profiles map", async () => {
    mockUserProfilesMap.set("conn-old", {
      userId: "user-old",
      profile: {
        name: "Old User",
      },
    });

    const manager = createSessionsManager(
      os,
      mockDataManager as any,
      mockLoginManager as any,
      mockHighlightsManager as any,
      i18n
    );
    const session = await manager.joinSession("group-abc");

    await waitFor(() =>
      session.allUsers.value.some((user) => user.connectionId === "conn-old")
    );

    expect(session.connectedUsers.value).toHaveLength(0);
    expect(session.allUsers.value).toEqual(
      expect.arrayContaining([
        {
          connectionId: "conn-old",
          userId: "user-old",
          profile: {
            name: "Old User",
          },
          isSelf: false,
          isActive: false,
          visual: getUserAnimalVisual("conn-old"),
          joinedAtMs: null,
        },
      ])
    );
  });

  describe("reading extension sync", () => {
    function createManagerWith(
      registry: ReturnType<typeof createBibleReadingExtensionManager>
    ) {
      return createSessionsManager(
        os,
        mockDataManager as any,
        mockLoginManager as any,
        mockHighlightsManager as any,
        i18n,
        registry
      );
    }

    it("writes locally enabled extensions and their data into the shared map", async () => {
      const registry = createBibleReadingExtensionManager();
      registry.registerReadingExtension({ id: "x", activate: () => ({}) });
      const session = await createManagerWith(registry).createSession();

      session.readingState.enableExtension("x", { v: 1 });

      expect(mockExtensionsMap.set).toHaveBeenCalledWith("x", {
        enabled: true,
        data: { v: 1 },
      });
    });

    it("enables extensions present in the shared map when joining", async () => {
      mockExtensionsMap.set("x", { enabled: true, data: { v: 2 } });
      const registry = createBibleReadingExtensionManager();
      registry.registerReadingExtension({ id: "x", activate: () => ({}) });

      const session = await createManagerWith(registry).joinSession("abc");

      expect(session.readingState.enableExtension).toHaveBeenCalledWith("x", {
        v: 2,
      });
      expect(session.readingState.isExtensionEnabled("x")).toBe(true);
    });

    it("skips shared extensions that are not registered locally", async () => {
      mockExtensionsMap.set("y", { enabled: true, data: {} });
      const registry = createBibleReadingExtensionManager();

      const session = await createManagerWith(registry).joinSession("abc");

      expect(session.readingState.enableExtension).not.toHaveBeenCalled();
      expect(session.readingState.isExtensionEnabled("y")).toBe(false);
    });

    it("round-trips playlist playback data (playlists + queue + step) through the shared map", async () => {
      const registry = createBibleReadingExtensionManager();
      registry.registerReadingExtension({
        id: "playlist",
        activate: () => ({}),
      });
      const session = await createManagerWith(registry).createSession();

      // The playlist extension stores its playback state here; it must survive
      // the JSON-based mirror unchanged so peers rebuild the same playback.
      const data = {
        playlists: [
          {
            id: "playlist-1",
            recordName: "user-1",
            authorUserId: "user-1",
            title: "P",
            description: null,
            items: [{ type: "html", html: "a" }],
            createdAtMs: 1,
            updatedAtMs: 1,
          },
        ],
        queue: [{ type: "html", html: "a" }],
        step: 0,
      };

      session.readingState.enableExtension("playlist", data);

      expect(mockExtensionsMap.set).toHaveBeenCalledWith("playlist", {
        enabled: true,
        data,
      });
    });

    it("does not sync extension data (e.g. playlist advance) when the current user is not an allowed navigator", async () => {
      mockLoginManager.userId.value = "user-blocked";
      const registry = createBibleReadingExtensionManager();
      registry.registerReadingExtension({
        id: "playlist",
        activate: () => ({}),
      });
      const session =
        await createManagerWith(registry).joinSession("group-abc");

      mockOptionsMap.setEmitOnSet(true);
      session.updateOptions({
        allowedNavigators: ["user-allowed", "conn-self"],
      });

      mockExtensionsMap.set.mockClear();

      // Simulates a restricted (non-host) participant advancing a playlist:
      // its outbound `data` mirror must not reach the shared map, the same
      // restriction that already applies to ordinary chapter navigation.
      session.readingState.enableExtension("playlist", { step: 1 });

      expect(mockExtensionsMap.set).not.toHaveBeenCalled();
    });

    it("disables an extension when it is removed from the shared map", async () => {
      mockExtensionsMap.setEmitOnSet(true);
      mockExtensionsMap.set("x", { enabled: true, data: {} });
      const registry = createBibleReadingExtensionManager();
      registry.registerReadingExtension({ id: "x", activate: () => ({}) });

      const session = await createManagerWith(registry).joinSession("abc");
      expect(session.readingState.isExtensionEnabled("x")).toBe(true);

      mockExtensionsMap.delete("x");

      expect(session.readingState.disableExtension).toHaveBeenCalledWith("x");
      expect(session.readingState.isExtensionEnabled("x")).toBe(false);
    });
  });
});
