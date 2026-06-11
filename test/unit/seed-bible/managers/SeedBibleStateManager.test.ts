import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  type CreateTestSeedBibleStateOptions,
  waitForInitialLoad,
} from "../testUtils/createTestSeedBibleState";
import { signal } from "@preact/signals";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import type { Mock } from "vitest";

const mockSaveReadingHistory = vi.fn();
const mockHighlightsManager = {
  getChapterHighlights: vi.fn().mockReturnValue(signal({ highlights: [] })),
  saveChapterHighlights: vi.fn(),
};
const mockSessionsManager = {
  createSession: vi.fn(),
  joinSession: vi.fn(),
};

vi.mock(
  "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager",
  () => ({
    createReadingHistoryManager: () => ({
      saveReadingHistory: mockSaveReadingHistory,
      getReadingEvents: vi.fn().mockResolvedValue([]),
    }),
  })
);

vi.mock("@packages/seed-bible/seed-bible/managers/HighlightsManager", () => ({
  createHighlightsManager: () => mockHighlightsManager,
}));

vi.mock("@packages/seed-bible/seed-bible/managers/SessionsManager", () => ({
  createSessionsManager: () => mockSessionsManager,
}));

vi.mock(
  "@packages/seed-bible/seed-bible/i18n/I18nManager",
  async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    I18nProvider: ({ children }: { children: unknown }) => children,
  })
);

vi.mock("@packages/seed-bible/seed-bible/managers/SearchManager", () => ({
  createSearchManager: vi.fn().mockReturnValue({
    searchVerses: vi.fn(),
  }),
}));

let logSpy: Mock;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  mockSaveReadingHistory.mockReset();
  mockHighlightsManager.getChapterHighlights.mockReset();
  mockHighlightsManager.getChapterHighlights.mockReturnValue(
    signal({ highlights: [] })
  );
  mockHighlightsManager.saveChapterHighlights.mockReset();
  mockSessionsManager.createSession.mockReset();
  mockSessionsManager.joinSession.mockReset();
});

afterEach(() => {
  logSpy.mockRestore();
});

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

async function createState() {
  return createTestSeedBibleState();
}

function createMockSharedSession(id: string) {
  return {
    id,
    readingState: {
      translationId: signal<string | null>(null),
      bookId: signal<string | null>(null),
      chapterNumber: signal<number | null>(null),
      chapterData: signal(null),
      selectedVerses: signal([]),
      translationBooks: signal(null),
      selectTranslationAndChapter: vi.fn().mockResolvedValue(undefined),
    },
    document: {} as SharedDocument,
    options: signal({
      allowedNavigators: null,
      allowedDecorators: null,
      hostUserId: null,
      highlightDurationSeconds: 16,
      endedAt: null,
    }),
    connectedUsers: signal([]),
    updateOptions: vi.fn(),
    removeSharedDecoration: vi.fn(),
    dispose: vi.fn(),
  } as any;
}

async function createStateWithOptions(
  options: CreateTestSeedBibleStateOptions
) {
  return createTestSeedBibleState(options);
}

async function createStateWithTwoTabs() {
  const state = await createState();
  const initialSelectedTabId = state.tabs.selectedTabId.value;
  const nextTab = state.tabs.addTab();
  await waitForInitialLoad(nextTab.readingState, 1000);
  state.tabs.selectTab(initialSelectedTabId);
  return state;
}

describe("createSeedBibleState", () => {
  it("created with default values", async () => {
    const state = await createState();

    expect(state.config.config.value.disablePanels).toBe(false);
    expect(state.app.panelsEnabled.value).toBe(true);

    expect(state.tabs.tabs.value).toHaveLength(1);
    expect(state.tabs.selectedTabId.value).toBe("tab-1");
    expect(state.app.selectedTab.value?.id).toBe("tab-1");

    expect(state.panes.panes.value).toHaveLength(1);
    expect(state.panes.panes.value[0]?.tab?.id).toBe("tab-1");
    expect(state.panes.selectedPaneId.value).toBe(
      state.panes.panes.value[0]?.id ?? null
    );

    expect(state.selector.isOpen.value).toBe(false);
    expect(state.highlights).toBe(mockHighlightsManager as any);
    expect(state.sessions).toBe(mockSessionsManager);
    expect(typeof state.search.searchVerses).toBe("function");
  });

  it("selecting a tab selects the tab and switches the pane to display the selected tab", async () => {
    const state = await createStateWithTwoTabs();

    state.panes.setLayout("split-2v");
    const firstPane = state.panes.panes.value[0]!;
    const secondPane = state.panes.panes.value[1]!;
    state.panes.openInPane(secondPane.id, {
      tabId: "tab-2",
    });
    state.panes.selectPane(firstPane.id);

    state.app.selectTab("tab-2");

    const selectedPane = state.panes.panes.value.find(
      (pane) => pane.id === state.panes.selectedPaneId.value
    );

    expect(state.tabs.selectedTabId.value).toBe("tab-2");
    expect(selectedPane?.tab?.id).toBe("tab-2");
  });

  it("adding a tab opens the bible selector in new-tab mode for the selected pane", async () => {
    const state = await createState();
    const selectedPaneId = state.panes.selectedPaneId.value;
    const previousTabCount = state.tabs.tabs.value.length;

    state.app.addTab();

    // forceNewTab is set synchronously inside setOpen before the async
    // syncStateFromPane work; isOpen flips to true only after that work
    // resolves, so wait for it.
    await waitFor(() => state.selector.isOpen.value === true);

    // No tab is created until the user picks a chapter — addTab opens the
    // selector first so the new tab can be seeded with the chosen book.
    expect(state.tabs.tabs.value).toHaveLength(previousTabCount);
    expect(state.selector.forceNewTab.value).toBe(true);
    expect(state.selector.pane.value?.id).toBe(selectedPaneId);
  });

  it("createSharedSession() creates a shared session and adds a tab for its reading state", async () => {
    const state = await createState();
    const previousTabCount = state.tabs.tabs.value.length;
    const sessionReadingState = state.tabs.tabs.value[0]!.readingState;
    const session = {
      id: "session-123",
      readingState: sessionReadingState,
      document: {} as SharedDocument,
      options: signal({
        allowedNavigators: null,
        allowedDecorators: null,
        hostUserId: null,
        highlightDurationSeconds: 16,
        endedAt: null,
      }),
      connectedUsers: signal([]),
      updateOptions: vi.fn(),
      removeSharedDecoration: vi.fn(),
      dispose: vi.fn(),
    };
    mockSessionsManager.createSession.mockResolvedValue(session);

    const result = await state.app.createSharedSession();

    expect(mockSessionsManager.createSession).toHaveBeenCalledTimes(1);
    expect(result).toBe(session);
    expect(state.tabs.tabs.value).toHaveLength(previousTabCount + 1);
    expect(state.tabs.tabs.value[previousTabCount]?.readingState).toBe(
      sessionReadingState
    );
    expect(state.tabs.tabs.value[previousTabCount]?.sharedSession).toBe(
      session
    );
    expect(state.tabs.selectedTabId.value).toBe(
      state.tabs.tabs.value[previousTabCount]?.id
    );
  });

  it("createSharedSession() captures a create_session posthog event", async () => {
    const mockPosthogCapture = vi.fn();
    (globalThis as any).posthog = {
      capture: mockPosthogCapture,
    };

    try {
      const state = await createState();
      const session = createMockSharedSession("session-create-event");
      mockSessionsManager.createSession.mockResolvedValue(session);

      await state.app.createSharedSession();

      expect(mockPosthogCapture).toHaveBeenCalledWith("create_session", {
        sessionId: "session-create-event",
      });
    } finally {
      delete (globalThis as any).posthog;
    }
  });

  it("joinSharedSession(id) joins a shared session and adds a tab for its reading state", async () => {
    const state = await createStateWithTwoTabs();
    const previousTabCount = state.tabs.tabs.value.length;
    const sessionReadingState = state.tabs.tabs.value[1]!.readingState;
    const session = {
      id: "group-abc",
      readingState: sessionReadingState,
      document: {} as SharedDocument,
      options: signal({
        allowedNavigators: null,
        allowedDecorators: null,
        hostUserId: null,
        highlightDurationSeconds: 16,
        endedAt: null,
      }),
      connectedUsers: signal([]),
      updateOptions: vi.fn(),
      removeSharedDecoration: vi.fn(),
      dispose: vi.fn(),
    };
    mockSessionsManager.joinSession.mockResolvedValue(session);

    const result = await state.app.joinSharedSession("group-abc");

    expect(mockSessionsManager.joinSession).toHaveBeenCalledWith("group-abc");
    expect(result).toBe(session);
    expect(state.tabs.tabs.value).toHaveLength(previousTabCount + 1);
    expect(state.tabs.tabs.value[previousTabCount]?.readingState).toBe(
      sessionReadingState
    );
    expect(state.tabs.tabs.value[previousTabCount]?.sharedSession).toBe(
      session
    );
    expect(state.tabs.selectedTabId.value).toBe(
      state.tabs.tabs.value[previousTabCount]?.id
    );
  });

  it("joinSharedSession(id) captures a join_session posthog event", async () => {
    const mockPosthogCapture = vi.fn();
    (globalThis as any).posthog = {
      capture: mockPosthogCapture,
    };

    try {
      const state = await createStateWithTwoTabs();
      const session = createMockSharedSession("session-join-event");
      mockSessionsManager.joinSession.mockResolvedValue(session);

      await state.app.joinSharedSession("group-abc");

      expect(mockPosthogCapture).toHaveBeenCalledWith("join_session", {
        sessionId: "session-join-event",
      });
    } finally {
      delete (globalThis as any).posthog;
    }
  });

  it("does not auto-join a shared session when sessionId is missing from URL tags", async () => {
    const state = await createState();

    await waitFor(() => state.tabs.tabs.value.length >= 1);

    expect(mockSessionsManager.joinSession).not.toHaveBeenCalled();
    expect(state.tabs.tabs.value).toHaveLength(1);
  });

  it("auto-joins a shared session when sessionId is present in the URL", async () => {
    const session = createMockSharedSession("url-session-123");
    mockSessionsManager.joinSession.mockResolvedValue(session);

    window.history.replaceState(null, "", "?sessionId=url-session-123");
    try {
      const state = await createStateWithOptions({});

      await waitFor(
        () => mockSessionsManager.joinSession.mock.calls.length === 1
      );

      expect(mockSessionsManager.joinSession).toHaveBeenCalledWith(
        "url-session-123"
      );
      expect(state.tabs.tabs.value).toHaveLength(2);
      expect(state.tabs.tabs.value[1]?.sharedSession).toBe(session);
      expect(state.tabs.selectedTabId.value).toBe("tab-2");
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("tabs can be opened in new panes", async () => {
    const state = await createStateWithTwoTabs();

    state.app.openInNewPane("tab-2");

    expect(state.panes.panes.value).toHaveLength(2);
    expect(
      state.panes.panes.value.some((pane) => pane.tab?.id === "tab-2")
    ).toBe(true);
    expect(state.tabs.selectedTabId.value).toBe("tab-2");
  });

  it("selecting a pane that has a tab also selects the tab for the pane", async () => {
    const state = await createStateWithTwoTabs();

    state.panes.setLayout("split-2v");
    const secondPane = state.panes.panes.value[1]!;
    state.panes.openInPane(secondPane.id, {
      tabId: "tab-2",
    });
    state.app.selectPane(secondPane.id);

    expect(state.panes.selectedPaneId.value).toBe(secondPane.id);
    expect(state.tabs.selectedTabId.value).toBe("tab-2");
  });

  it("selecting a pane that has a grid portal doesn't open the bible selector", async () => {
    const state = await createState();

    state.panes.openPane({
      type: "attached",
      gridPortal: "test_portal",
    });
    const secondPane = state.panes.panes.value[1]!;
    state.app.selectPane(secondPane.id);

    expect(state.panes.selectedPaneId.value).toBe(secondPane.id);
    expect(state.selector.isOpen.value).toBe(false);
  });

  it("selecting a pane that has a map portal doesn't open the bible selector", async () => {
    const state = await createState();

    state.panes.openPane({
      type: "attached",
      mapPortal: "test_portal",
    });
    const secondPane = state.panes.panes.value[1]!;
    state.app.selectPane(secondPane.id);

    expect(state.panes.selectedPaneId.value).toBe(secondPane.id);
    expect(state.selector.isOpen.value).toBe(false);
  });

  it("selecting an empty pane opens the bible selector", async () => {
    const state = await createState();

    state.panes.setLayout("split-2v");
    const emptyPane =
      state.panes.panes.value.find(
        (pane) => pane.tab === null && pane.component === null
      ) ?? null;

    expect(emptyPane).not.toBeNull();

    state.app.selectPane(emptyPane!.id);
    await waitFor(() => state.selector.isOpen.value === true);

    expect(state.selector.isOpen.value).toBe(true);
    expect(state.selector.pane.value?.id).toBe(emptyPane!.id);
  });

  describe("reading history autosave", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function setSelectedTabChapter(
      state: SeedBibleState,
      bookId: string,
      chapterNumber: number
    ) {
      const tab =
        state.tabs.tabs.value.find(
          (t) => t.id === state.tabs.selectedTabId.value
        ) ?? null;
      expect(tab).not.toBeNull();
      tab!.readingState.chapterData.value = {
        translation: { id: "test-translation", name: "Test Translation" },
        book: { id: bookId, name: "Test Book", abbreviation: bookId },
        chapter: {
          number: chapterNumber,
          id: `${bookId}-${chapterNumber}`,
          reference: `${bookId} ${chapterNumber}`,
        },
        verses: [],
        notes: [],
      } as any;
    }

    it("does not save history when no tab is selected", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1);
      mockSaveReadingHistory.mockClear();

      state.tabs.selectedTabId.value = "missing-tab";

      vi.advanceTimersByTime(6000);
      expect(mockSaveReadingHistory).not.toHaveBeenCalled();
    });

    it("does not save history when chapter data is not available", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1);
      mockSaveReadingHistory.mockClear();

      const selected =
        state.tabs.tabs.value.find(
          (t) => t.id === state.tabs.selectedTabId.value
        ) ?? null;
      expect(selected).not.toBeNull();
      selected!.readingState.chapterData.value = null;

      vi.advanceTimersByTime(6000);
      expect(mockSaveReadingHistory).not.toHaveBeenCalled();
    });

    it("saves first history event after 5 seconds of viewing", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1);
      mockSaveReadingHistory.mockClear();

      vi.advanceTimersByTime(4999);
      expect(mockSaveReadingHistory).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockSaveReadingHistory).toHaveBeenCalledTimes(1);
      expect(mockSaveReadingHistory).toHaveBeenLastCalledWith("genesis", 1);
    });

    it("saves history once for each additional 5 seconds of viewing", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1);
      mockSaveReadingHistory.mockClear();

      vi.advanceTimersByTime(15000);

      expect(mockSaveReadingHistory).toHaveBeenCalledTimes(3);
      expect(mockSaveReadingHistory).toHaveBeenNthCalledWith(1, "genesis", 1);
      expect(mockSaveReadingHistory).toHaveBeenNthCalledWith(2, "genesis", 1);
      expect(mockSaveReadingHistory).toHaveBeenNthCalledWith(3, "genesis", 1);
    });

    it("resets autosave interval when selected tab changes", async () => {
      const state = await createState();
      state.tabs.addTab();
      state.tabs.selectedTabId.value = "tab-1";
      setSelectedTabChapter(state, "genesis", 1);

      state.tabs.selectedTabId.value = "tab-2";
      setSelectedTabChapter(state, "exodus", 2);
      mockSaveReadingHistory.mockClear();

      vi.advanceTimersByTime(3000);
      state.tabs.selectedTabId.value = "tab-1";
      setSelectedTabChapter(state, "genesis", 1);

      vi.advanceTimersByTime(2000);
      expect(mockSaveReadingHistory).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);
      expect(mockSaveReadingHistory).toHaveBeenCalledTimes(1);
      expect(mockSaveReadingHistory).toHaveBeenLastCalledWith("genesis", 1);
    });

    it("resets autosave interval when chapter data changes", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1);
      mockSaveReadingHistory.mockClear();

      vi.advanceTimersByTime(3000);
      setSelectedTabChapter(state, "genesis", 2);

      vi.advanceTimersByTime(2000);
      expect(mockSaveReadingHistory).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);
      expect(mockSaveReadingHistory).toHaveBeenCalledTimes(1);
      expect(mockSaveReadingHistory).toHaveBeenLastCalledWith("genesis", 2);
    });
  });

  describe("posthog user_chapter_read", () => {
    let mockPosthogCapture: Mock;

    beforeEach(() => {
      vi.useFakeTimers();
      mockPosthogCapture = vi.fn();
      (globalThis as any).posthog = { capture: mockPosthogCapture };
    });

    afterEach(() => {
      vi.useRealTimers();
      delete (globalThis as any).posthog;
    });

    function setSelectedTabChapter(
      state: SeedBibleState,
      bookId: string,
      chapterNumber: number,
      translationId = "test-translation"
    ) {
      const tab =
        state.tabs.tabs.value.find(
          (t) => t.id === state.tabs.selectedTabId.value
        ) ?? null;
      expect(tab).not.toBeNull();
      tab!.readingState.chapterData.value = {
        translation: { id: translationId, name: "Test Translation" },
        book: { id: bookId, name: "Test Book", abbreviation: bookId },
        chapter: {
          number: chapterNumber,
          id: `${bookId}-${chapterNumber}`,
          reference: `${bookId} ${chapterNumber}`,
        },
        verses: [],
        notes: [],
      } as any;
    }

    it("does nothing if posthog isn't available", async () => {
      delete (globalThis as any).posthog;
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1);

      vi.advanceTimersByTime(30_000);

      expect(mockPosthogCapture).not.toHaveBeenCalled();
    });

    it("calls capture() after 30 seconds with translationId, bookId, and chapter as a string", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1, "esv");

      vi.advanceTimersByTime(29_999);
      expect(mockPosthogCapture).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockPosthogCapture).toHaveBeenCalledTimes(1);
      expect(mockPosthogCapture).toHaveBeenCalledWith("user_chapter_read", {
        translationId: "esv",
        bookId: "genesis",
        chapter: "1",
      });
    });

    it("restarts the timer when the chapter changes", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", 1, "esv");

      vi.advanceTimersByTime(20_000);
      setSelectedTabChapter(state, "genesis", 2, "esv");

      vi.advanceTimersByTime(29_999);
      expect(mockPosthogCapture).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockPosthogCapture).toHaveBeenCalledTimes(1);
      expect(mockPosthogCapture).toHaveBeenCalledWith("user_chapter_read", {
        translationId: "esv",
        bookId: "genesis",
        chapter: "2",
      });
    });
  });

  describe("pageTitle tag", () => {
    function setSelectedTabChapter(
      state: SeedBibleState,
      bookId: string,
      bookName: string,
      chapterNumber: number,
      translationName = "Test Translation",
      textDirection: "ltr" | "rtl" = "ltr"
    ) {
      const tab =
        state.tabs.tabs.value.find(
          (t) => t.id === state.tabs.selectedTabId.value
        ) ?? null;
      expect(tab).not.toBeNull();
      tab!.readingState.chapterData.value = {
        translation: {
          id: "test-translation",
          name: translationName,
          textDirection,
        },
        book: { id: bookId, name: bookName, abbreviation: bookId },
        chapter: {
          number: chapterNumber,
          id: `${bookId}-${chapterNumber}`,
          reference: `${bookName} ${chapterNumber}`,
        },
        verses: [],
        notes: [],
      } as any;
    }

    it("sets pageTitle from the selected book and chapter", async () => {
      const state = await createState();

      setSelectedTabChapter(state, "genesis", "Genesis", 7, "ESV");

      expect(document.title).toBe("Genesis 7 - ESV | Seed Bible");
    });

    it("updates pageTitle when the chapter changes", async () => {
      const state = await createState();

      setSelectedTabChapter(state, "genesis", "Genesis", 1, "ESV");
      expect(document.title).toBe("Genesis 1 - ESV | Seed Bible");

      setSelectedTabChapter(state, "genesis", "Genesis", 2, "ESV");
      expect(document.title).toBe("Genesis 2 - ESV | Seed Bible");
    });

    it("prepends an RTL marker for right-to-left translations", async () => {
      const state = await createState();
      const RTLE_CHAR = "\u202B";

      setSelectedTabChapter(state, "genesis", "Genesis", 1, "Arabic", "rtl");

      expect(document.title).toBe(
        `${RTLE_CHAR}Genesis 1 - Arabic | Seed Bible`
      );
    });
  });
});
