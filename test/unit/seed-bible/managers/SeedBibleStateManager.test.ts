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
  beforeEach(() => {
    localStorage.clear();
    jsdom.reconfigure({
      url: "https://example.com",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    expect(state.bibleData.api.endpoint).toBe("https://vmfnri.helloao.org/");
  });

  it("should use the free use bible API if specified in the URL", async () => {
    jsdom.reconfigure({
      url: "https://example.com?useFreeBibleAPI=true",
    });

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

    expect(state.bibleData.api.endpoint).toBe("https://bible.helloao.org/");
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

  it("opens an independent, hidden tab in a new pane when the tab is already shown in the current pane", async () => {
    const state = await createState();
    // The single pane shows the selected tab (tab-1).
    expect(state.panes.panes.value).toHaveLength(1);
    expect(state.panes.panes.value[0]?.tab?.id).toBe("tab-1");

    state.app.openInNewPane("tab-1");

    // A second pane appears, bound to a *different* tab so it is not
    // de-duplicated away (would leave an empty pane) and so chapter navigation
    // moves only one pane (independent reading states).
    expect(state.panes.panes.value).toHaveLength(2);
    const tabIds = state.panes.panes.value.map((pane) => pane.tab?.id ?? null);
    expect(tabIds.every((id) => id !== null)).toBe(true);
    expect(new Set(tabIds).size).toBe(2);

    // The cloned tab is pane-only (hidden from the tab strip): the user still
    // sees a single visible tab.
    const visibleTabs = state.tabs.tabs.value.filter((tab) => !tab.paneOnly);
    expect(visibleTabs).toHaveLength(1);
    expect(visibleTabs[0]?.id).toBe("tab-1");
  });

  it("opens an independent, hidden tab in a detached pane when the tab is already shown in the current pane", async () => {
    const state = await createState();
    expect(state.panes.panes.value).toHaveLength(1);
    const originalTabId = state.panes.panes.value[0]?.tab?.id ?? null;

    state.app.openInDetachedPane("tab-1");

    const detachedPanes = state.panes.panes.value.filter(
      (pane) => pane.detached
    );
    expect(detachedPanes).toHaveLength(1);
    // The detached pane gets its own tab so navigating it does not move the
    // attached pane.
    const detachedTabId = detachedPanes[0]?.tab?.id ?? null;
    expect(detachedTabId).not.toBe(null);
    expect(detachedTabId).not.toBe(originalTabId);
    expect(state.tabs.tabs.value.filter((tab) => !tab.paneOnly)).toHaveLength(
      1
    );

    // Closing the detached pane disposes the hidden tab so it does not leak.
    state.panes.closePane(detachedPanes[0]!.id);
    expect(state.tabs.tabs.value.some((tab) => tab.id === detachedTabId)).toBe(
      false
    );
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

  describe("mobile pane restrictions", () => {
    // isMobile is derived from viewportWidth; the returned signal is the same
    // writable instance, so tests drive the mobile layout by writing to it.
    const setViewportWidth = (state: SeedBibleState, width: number) => {
      (state.app.viewportWidth as unknown as { value: number }).value = width;
    };

    it("shows at most two anchored panes, stacked top/bottom, on mobile", async () => {
      const state = await createState();
      // A four-slot desktop layout leaves four attached panes in the manager.
      state.panes.setLayout("grid-2x2");
      expect(
        state.panes.panes.value.filter((pane) => !pane.detached)
      ).toHaveLength(4);

      setViewportWidth(state, 400);

      const shownAttached = state.app.effectivePanes.value.filter(
        (pane) => !pane.detached
      );
      expect(shownAttached).toHaveLength(2);
      expect(state.app.effectiveLayout.value).toBe("stacked-2");

      // The manager's own layout/panes are left untouched so they are restored
      // on desktop.
      expect(state.panes.layout.value).toBe("grid-2x2");
      expect(
        state.panes.panes.value.filter((pane) => !pane.detached)
      ).toHaveLength(4);
    });

    it("uses the single layout on mobile when only one anchored pane exists", async () => {
      const state = await createState();
      setViewportWidth(state, 400);

      expect(
        state.app.effectivePanes.value.filter((pane) => !pane.detached)
      ).toHaveLength(1);
      expect(state.app.effectiveLayout.value).toBe("single");
    });

    it("restores the desktop layout when the viewport grows back", async () => {
      const state = await createState();
      state.panes.setLayout("grid-2x2");

      setViewportWidth(state, 400);
      expect(state.app.effectiveLayout.value).toBe("stacked-2");

      setViewportWidth(state, 1200);
      expect(state.app.effectiveLayout.value).toBe("grid-2x2");
      expect(
        state.app.effectivePanes.value.filter((pane) => !pane.detached)
      ).toHaveLength(4);
    });

    it("renders detached panes anchored to the bottom on mobile without changing their stored anchor", async () => {
      const state = await createState();
      const detached = state.panes.openPane({
        type: "detached",
        component: () => null,
      });
      expect(detached).not.toBeNull();
      expect(detached!.detachedAnchor).toBe("floating");

      setViewportWidth(state, 400);

      const effectiveDetached = state.app.effectivePanes.value.find(
        (pane) => pane.detached
      );
      expect(effectiveDetached?.detachedAnchor).toBe("bottom");

      // The stored anchor is preserved for when the layout returns to desktop.
      const storedDetached = state.panes.panes.value.find(
        (pane) => pane.detached
      );
      expect(storedDetached?.detachedAnchor).toBe("floating");
    });
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

  describe("openVerseReference", () => {
    it("navigates the selected tab to the given book and chapter", async () => {
      const state = await createState();
      const tab = state.tabs.tabs.value[0]!;
      const selectSpy = vi
        .spyOn(tab.readingState, "selectTranslationAndChapter")
        .mockResolvedValue(undefined);

      await state.app.openVerseReference({ book: "GEN", chapter: 2 });

      expect(selectSpy).toHaveBeenCalledWith(expect.any(String), "GEN", 2, {
        scrollToVerse: undefined,
      });
    });

    it("uses the tab's current translationId when navigating", async () => {
      const state = await createState();
      const tab = state.tabs.tabs.value[0]!;
      tab.readingState.translationId.value = "niv";
      const selectSpy = vi
        .spyOn(tab.readingState, "selectTranslationAndChapter")
        .mockResolvedValue(undefined);

      await state.app.openVerseReference({ book: "GEN", chapter: 1 });

      expect(selectSpy).toHaveBeenCalledWith("niv", "GEN", 1, {
        scrollToVerse: undefined,
      });
    });

    it("falls back to DEFAULT_TRANSLATION_ID when the tab has no translationId", async () => {
      const state = await createState();
      const tab = state.tabs.tabs.value[0]!;
      const selectSpy = vi
        .spyOn(tab.readingState, "selectTranslationAndChapter")
        .mockResolvedValue(undefined);

      await state.app.openVerseReference({ book: "EXO", chapter: 3 });

      expect(selectSpy).toHaveBeenCalledWith("AAB", "EXO", 3, {
        scrollToVerse: undefined,
      });
    });

    it("falls back to the first tab when the selected tab id does not match any tab", async () => {
      const state = await createStateWithTwoTabs();
      const firstTab = state.tabs.tabs.value[0]!;
      const secondTab = state.tabs.tabs.value[1]!;
      state.tabs.selectedTabId.value = "nonexistent";
      const firstTabSpy = vi
        .spyOn(firstTab.readingState, "selectTranslationAndChapter")
        .mockResolvedValue(undefined);
      const secondTabSpy = vi
        .spyOn(secondTab.readingState, "selectTranslationAndChapter")
        .mockResolvedValue(undefined);

      await state.app.openVerseReference({ book: "JHN", chapter: 3 });

      expect(firstTabSpy).toHaveBeenCalledTimes(1);
      expect(secondTabSpy).not.toHaveBeenCalled();
    });

    it("passes the verse number as scrollToVerse when navigating", async () => {
      const state = await createState();
      const tab = state.tabs.tabs.value[0]!;
      const selectSpy = vi
        .spyOn(tab.readingState, "selectTranslationAndChapter")
        .mockResolvedValue(undefined);

      await state.app.openVerseReference({
        book: "JHN",
        chapter: 3,
        verse: 16,
      });

      expect(selectSpy).toHaveBeenCalledWith(expect.any(String), "JHN", 3, {
        scrollToVerse: 16,
      });
    });

    it("decorates the verse after navigating when a single verse is specified", async () => {
      const state = await createState();
      const tab = state.tabs.tabs.value[0]!;
      vi.spyOn(
        tab.readingState,
        "selectTranslationAndChapter"
      ).mockResolvedValue(undefined);
      const decorateSpy = vi.spyOn(tab.readingState, "decorateVerses");

      await state.app.openVerseReference({
        book: "JHN",
        chapter: 3,
        verse: 16,
      });

      expect(decorateSpy).toHaveBeenCalledWith("JHN", 3, 16, {
        className: "sb-verse-decoration-open-reference-highlight",
        removeAfterMs: 3000,
      });
    });

    it("decorates a range of verses when endVerse is specified", async () => {
      const state = await createState();
      const tab = state.tabs.tabs.value[0]!;
      vi.spyOn(
        tab.readingState,
        "selectTranslationAndChapter"
      ).mockResolvedValue(undefined);
      const decorateSpy = vi.spyOn(tab.readingState, "decorateVerses");

      await state.app.openVerseReference({
        book: "PSA",
        chapter: 23,
        verse: 1,
        endVerse: 3,
      });

      expect(decorateSpy).toHaveBeenCalledWith("PSA", 23, [1, 2, 3], {
        className: "sb-verse-decoration-open-reference-highlight",
        removeAfterMs: 3000,
      });
    });

    it("does not decorate when no verse is specified", async () => {
      const state = await createState();
      const tab = state.tabs.tabs.value[0]!;
      vi.spyOn(
        tab.readingState,
        "selectTranslationAndChapter"
      ).mockResolvedValue(undefined);
      const decorateSpy = vi.spyOn(tab.readingState, "decorateVerses");

      await state.app.openVerseReference({ book: "GEN", chapter: 1 });

      expect(decorateSpy).not.toHaveBeenCalled();
    });

    it("creates a new tab when no tabs exist", async () => {
      const state = await createState();
      const initialTabId = state.tabs.tabs.value[0]!.id;
      state.tabs.removeTab(initialTabId);
      const addTabSpy = vi.spyOn(state.tabs, "addTab");

      await state.app.openVerseReference({
        book: "GEN",
        chapter: 1,
        verse: 1,
      });

      expect(addTabSpy).toHaveBeenCalledWith(undefined, {
        initialBookId: "GEN",
        initialChapterNumber: 1,
        scrollToVerse: 1,
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

      expect(state.app.title.value).toBe("Genesis 7 - ESV | Seed Bible");
    });

    it("updates pageTitle when the chapter changes", async () => {
      const state = await createState();

      setSelectedTabChapter(state, "genesis", "Genesis", 1, "ESV");
      expect(state.app.title.value).toBe("Genesis 1 - ESV | Seed Bible");

      setSelectedTabChapter(state, "genesis", "Genesis", 2, "ESV");
      expect(state.app.title.value).toBe("Genesis 2 - ESV | Seed Bible");
    });

    it("does not prepend an RTL marker for right-to-left translations when the UI language is left-to-right", async () => {
      const state = await createState();
      setSelectedTabChapter(state, "genesis", "Genesis", 1, "Arabic", "rtl");

      expect(state.app.title.value).toBe(`Genesis 1 - Arabic | Seed Bible`);
    });

    it("prepends an RTL marker when the UI language is right-to-left", async () => {
      const state = await createState();
      const RTLE_CHAR = "\u202B";

      await state.i18n.changeLanguage("ar");
      setSelectedTabChapter(state, "genesis", "Genesis", 1, "AAB");

      expect(state.app.title.value).toBe(
        `${RTLE_CHAR}Genesis 1 - AAB | الكتاب المقدس للبذور`
      );
    });
  });
});
