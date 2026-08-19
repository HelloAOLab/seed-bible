import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type {
  Translation,
  TranslationBooks,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  createTestSeedBibleState,
  type CreateTestSeedBibleStateOptions,
  waitForInitialLoad,
} from "../testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  nivBooks,
  translations,
} from "./testUtils/mockBibleApiData";
import { batch, signal } from "@preact/signals";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import type { Mock } from "vitest";

// App defaults to the private API; shared mock maps target the free-use host.
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

const SPA_TRANSLATION: Translation = {
  id: "spa_onbv",
  name: "Open Nueva Biblia Viva",
  englishName: "Open Nueva Biblia Viva",
  website: "https://example.com",
  licenseUrl: "https://example.com/license",
  shortName: "ONBV",
  language: "spa",
  textDirection: "ltr",
  availableFormats: ["json"],
  listOfBooksApiLink: "/api/spa_onbv/books.json",
  numberOfBooks: 66,
  totalNumberOfChapters: 1189,
  totalNumberOfVerses: 31102,
};

const HIN_TRANSLATION: Translation = {
  id: "hin_cvb",
  name: "Hindi Contemporary Version",
  englishName: "Hindi Contemporary Version",
  website: "https://example.com",
  licenseUrl: "https://example.com/license",
  shortName: "CVB",
  language: "hin",
  textDirection: "ltr",
  availableFormats: ["json"],
  listOfBooksApiLink: "/api/hin_cvb/books.json",
  numberOfBooks: 66,
  totalNumberOfChapters: 1189,
  totalNumberOfVerses: 31102,
};

function booksForTranslation(
  base: TranslationBooks,
  translation: Translation
): TranslationBooks {
  return {
    translation,
    books: base.books.map((book) => ({
      ...book,
      firstChapterApiLink: `/api/${translation.id}/${book.id}/${book.firstChapterNumber ?? 1}.json`,
      lastChapterApiLink: `/api/${translation.id}/${book.id}/${book.lastChapterNumber}.json`,
    })),
  };
}

function privateUrl(path: string): string {
  return makeUrl(path, PRIVATE_API_ENDPOINT);
}

function createLanguageSwitchResponses(options?: {
  spaBooks?: TranslationBooks;
}): Record<string, ReturnType<typeof createResponse>> {
  const spaBooks =
    options?.spaBooks ?? booksForTranslation(aabBooks, SPA_TRANSLATION);
  const hinBooks = booksForTranslation(aabBooks, HIN_TRANSLATION);

  return {
    [privateUrl("/api/available_translations.json")]: createResponse({
      translations: [
        ...translations.translations,
        SPA_TRANSLATION,
        HIN_TRANSLATION,
      ],
    }),
    [privateUrl("/api/AAB/books.json")]: createResponse(aabBooks),
    [privateUrl("/api/AAB/GEN/1.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [privateUrl("/api/AAB/EXO/2.json")]: createResponse(
      makeChapter(aabBooks, "EXO", 2)
    ),
    [privateUrl("/api/spa_onbv/books.json")]: createResponse(spaBooks),
    [privateUrl("/api/spa_onbv/GEN/1.json")]: createResponse(
      makeChapter(spaBooks, "GEN", 1)
    ),
    [privateUrl("/api/spa_onbv/EXO/2.json")]: createResponse(
      makeChapter(spaBooks, "EXO", 2)
    ),
    [privateUrl("/api/spa_onbv/MAT/1.json")]: createResponse(
      makeChapter(spaBooks, "MAT", 1)
    ),
    [privateUrl("/api/hin_cvb/books.json")]: createResponse(hinBooks),
    [privateUrl("/api/hin_cvb/EXO/2.json")]: createResponse(
      makeChapter(hinBooks, "EXO", 2)
    ),
  };
}

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

// Partial: ChatsManager imports participant-visual helpers from this module, so
// replacing it wholesale breaks any test that creates a chat session.
vi.mock(
  "@packages/seed-bible/seed-bible/managers/SessionsManager",
  async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    createSessionsManager: () => mockSessionsManager,
  })
);

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
      getUrlQueryParams: vi.fn().mockReturnValue({}),
      // TabsManager subscribes to reading-state navigation events to drive the
      // URL; the mock just returns a no-op unsubscribe.
      onNavigate: vi.fn().mockReturnValue(() => undefined),
      // Reading-extension surface the (derived) playlist `playing` state reads.
      enabledExtensions: signal([]),
      isExtensionEnabled: vi.fn().mockReturnValue(false),
      enableExtension: vi.fn(),
      disableExtension: vi.fn(),
      dispose: vi.fn(),
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
    isSynced: signal(true),
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

    expect(state.settings.settings.value.disablePanels).toBe(false);
    expect(state.app.panelsEnabled.value).toBe(true);

    expect(state.tabs.tabs.value).toHaveLength(1);
    expect(state.tabs.selectedTabId.value).toBe("tab-1");
    expect(state.app.selectedTab.value?.id).toBe("tab-1");

    expect(state.tabsLayout.slots.value).toHaveLength(1);
    expect(state.tabsLayout.slots.value[0]?.tab?.id).toBe("tab-1");
    expect(state.tabsLayout.selectedSlotId.value).toBe(
      state.tabsLayout.slots.value[0]?.id ?? null
    );

    // Custom panes (fullscreen/side/floating) are a separate, initially-empty
    // list — no pane is created just because a tab exists.
    expect(state.panes.panes.value).toHaveLength(0);

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

    expect(state.settings.settings.value.disablePanels).toBe(false);
    expect(state.app.panelsEnabled.value).toBe(true);

    expect(state.tabs.tabs.value).toHaveLength(1);
    expect(state.tabs.selectedTabId.value).toBe("tab-1");
    expect(state.app.selectedTab.value?.id).toBe("tab-1");

    expect(state.tabsLayout.slots.value).toHaveLength(1);
    expect(state.tabsLayout.slots.value[0]?.tab?.id).toBe("tab-1");
    expect(state.tabsLayout.selectedSlotId.value).toBe(
      state.tabsLayout.slots.value[0]?.id ?? null
    );

    expect(state.panes.panes.value).toHaveLength(0);

    expect(state.selector.isOpen.value).toBe(false);
    expect(state.highlights).toBe(mockHighlightsManager as any);
    expect(state.sessions).toBe(mockSessionsManager);
    expect(typeof state.search.searchVerses).toBe("function");

    expect(state.bibleData.api.endpoint).toBe("https://bible.helloao.org/");
  });

  it("always spells out the language segment in the canonical URL", async () => {
    // The three-segment form is a redirect entry point, not a destination, so
    // it must never be advertised as canonical.
    jsdom.reconfigure({ url: "https://example.com?useFreeBibleAPI=true" });
    const state = await createState();
    const readingState = state.tabs.tabs.value[0]!.readingState;
    await waitFor(() => readingState.chapterData.value !== null);

    expect(state.app.canonicalUrl.value).not.toContain("lang=");
    expect(state.app.canonicalUrl.value).toBe("/en/AAB/genesis/1");
  });

  it("keys the canonical URL to the translation, not the reader's UI language", async () => {
    // A French interface over the English AAB is the same scripture as an
    // English one, so both have to point at the single indexable copy rather
    // than each claiming to be canonical.
    jsdom.reconfigure({ url: "https://example.com?useFreeBibleAPI=true" });
    const state = await createState();
    const readingState = state.tabs.tabs.value[0]!.readingState;
    await waitFor(() => readingState.chapterData.value !== null);

    try {
      await state.i18n.changeLanguage("de");
      expect(state.app.canonicalUrl.value).toBe("/en/AAB/genesis/1");
    } finally {
      await state.i18n.changeLanguage("en");
    }
  });

  it("still produces the real canonical URL when the chapter fails to load", async () => {
    // Regression for `<link rel="canonical" href="/">`: this used to key off
    // `chapterData`, so any load failure pointed the page at the site root.
    // Genesis 2 is a real chapter the fixture has no response for, so the
    // position resolves but the fetch fails.
    jsdom.reconfigure({
      url: "https://example.com/en/AAB/genesis/2?useFreeBibleAPI=true",
    });
    const state = await createState();
    const readingState = state.tabs.tabs.value[0]!.readingState;
    await waitFor(() => readingState.error.value !== null);

    expect(readingState.chapterData.value).toBeNull();
    expect(state.app.canonicalUrl.value).toBe("/en/AAB/genesis/2");
  });

  it("selecting a tab selects the tab and switches the slot to display the selected tab", async () => {
    const state = await createStateWithTwoTabs();

    state.tabsLayout.setLayout("split-2v");
    const firstSlot = state.tabsLayout.slots.value[0]!;
    const secondSlot = state.tabsLayout.slots.value[1]!;
    state.tabsLayout.openTabInSlot(secondSlot.id, "tab-2");
    state.tabsLayout.selectSlot(firstSlot.id);

    state.app.selectTab("tab-2");

    const selectedSlot = state.tabsLayout.slots.value.find(
      (slot) => slot.id === state.tabsLayout.selectedSlotId.value
    );

    expect(state.tabs.selectedTabId.value).toBe("tab-2");
    expect(selectedSlot?.tab?.id).toBe("tab-2");
  });

  it("regression #1442: deleting the selected tab displays the remaining tab instead of an empty slot", async () => {
    // Reproduces https://github.com/HelloAOLab/seed-bible/issues/1442:
    // 1. Start with one tab, add a second (auto-selected).
    // 2. Select the second tab explicitly.
    // 3. Delete the second tab.
    // 4. The first tab should become selected AND should actually be shown in
    //    the slot — not leave the slot pointing at the now-removed tab.
    const state = await createState();
    const firstTabId = state.tabs.selectedTabId.value;

    const secondTab = state.tabs.addTab();
    await waitForInitialLoad(secondTab.readingState, 1000);
    state.app.selectTab(secondTab.id);

    expect(state.tabs.selectedTabId.value).toBe(secondTab.id);

    state.tabs.removeTab(secondTab.id);

    expect(state.tabs.selectedTabId.value).toBe(firstTabId);
    expect(state.app.selectedTab.value?.id).toBe(firstTabId);

    const selectedSlot = state.tabsLayout.slots.value.find(
      (slot) => slot.id === state.tabsLayout.selectedSlotId.value
    );
    // Before the fix, the slot that used to show the deleted tab was left
    // empty (tab: null) even though selectedTabId pointed at the first tab.
    expect(selectedSlot?.tab?.id).toBe(firstTabId);
  });

  it("adding a tab opens the bible selector in new-tab mode for the selected slot", async () => {
    const state = await createState();
    const selectedSlotId = state.tabsLayout.selectedSlotId.value;
    const previousTabCount = state.tabs.tabs.value.length;

    state.app.addTab();

    // forceNewTab is set synchronously inside setOpen before the async
    // syncStateFromSlot work; isOpen flips to true only after that work
    // resolves, so wait for it.
    await waitFor(() => state.selector.isOpen.value === true);

    // No tab is created until the user picks a chapter — addTab opens the
    // selector first so the new tab can be seeded with the chosen book.
    expect(state.tabs.tabs.value).toHaveLength(previousTabCount);
    expect(state.selector.forceNewTab.value).toBe(true);
    expect(state.selector.slot.value?.id).toBe(selectedSlotId);
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

  it("regression #1589: createSharedSession() starts the session where the active tab is reading", async () => {
    jsdom.reconfigure({ url: "https://example.com?useFreeBibleAPI=true" });
    // Two tabs on different chapters, so a session that read the position off
    // the wrong tab can't look correct by accident.
    const state = await createStateWithTwoTabs();
    const activeTab = state.tabs.tabs.value[1]!;
    await activeTab.readingState.selectTranslationAndChapter("AAB", "EXO", 2);
    state.app.selectTab(activeTab.id);
    mockSessionsManager.createSession.mockResolvedValue(
      createMockSharedSession("session-position")
    );

    await state.app.createSharedSession();

    expect(mockSessionsManager.createSession).toHaveBeenCalledWith({
      initialTranslationId: "AAB",
      initialBookId: "EXO",
      initialChapterNumber: 2,
    });
  });

  it("createSharedSession() captures a create_session posthog event", async () => {
    const mockPosthogCapture = vi.fn();
    (globalThis as any).posthog = {
      capture: mockPosthogCapture,
      onFeatureFlags: vi.fn(),
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
      onFeatureFlags: vi.fn(),
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

  describe("host-disconnect grace timer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const HOST_ID = "host-user-1";
    const hostConnectedUser = {
      userId: HOST_ID,
      connectionId: "host-connection",
      isSelf: false,
    };
    // Our own presence entry. The grace timer only trusts a presence list
    // that includes us — a list missing self means the presence channel
    // itself is broken, not that anyone actually left.
    const selfConnectedUser = {
      userId: "guest-user-1",
      connectionId: "guest-connection",
      isSelf: true,
    };

    function createMockHostedSession(id: string) {
      const session = createMockSharedSession(id);
      session.options.value = {
        ...session.options.value,
        hostUserId: HOST_ID,
      };
      return session;
    }

    async function joinAsHostedSession(state: SeedBibleState, id: string) {
      const session = createMockHostedSession(id);
      // `wrapSessionLifecycle` (invoked by `joinSharedSession` below)
      // replaces `session.dispose` with its own wrapper, so the original
      // spy must be captured before that happens in order to assert on it.
      const originalDispose = session.dispose;
      mockSessionsManager.joinSession.mockResolvedValue(session);
      await state.app.joinSharedSession(id);
      // Seed `sessionsWhereHostWasSeen` — the host must be observed as
      // connected at least once before the disconnect heuristic applies,
      // so joiners don't immediately close their own tab before they even
      // see the host.
      session.connectedUsers.value = [selfConnectedUser, hostConnectedUser];
      return { session, originalDispose };
    }

    it("does not start the disconnect timer while this client's own connection is unsynced", async () => {
      const state = await createStateWithTwoTabs();
      const { session, originalDispose } = await joinAsHostedSession(
        state,
        "session-unsynced"
      );
      const tabId = state.tabs.tabs.value.find(
        (tab) => tab.sharedSession === session
      )!.id;

      session.isSynced.value = false;
      session.connectedUsers.value = [selfConnectedUser];

      vi.advanceTimersByTime(20_000);

      expect(state.tabs.tabs.value.some((tab) => tab.id === tabId)).toBe(true);
      expect(originalDispose).not.toHaveBeenCalled();
      expect(state.app.currentToast.value).toBeNull();
    });

    it("shows a reconnecting toast and closes the tab after the grace period once synced and the host is still gone", async () => {
      const state = await createStateWithTwoTabs();
      const { session, originalDispose } = await joinAsHostedSession(
        state,
        "session-grace"
      );
      const tabId = state.tabs.tabs.value.find(
        (tab) => tab.sharedSession === session
      )!.id;

      session.connectedUsers.value = [selfConnectedUser];

      expect(state.app.currentToast.value?.message).toBe(
        "Reconnecting to the session…"
      );
      expect(originalDispose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(29_999);
      expect(originalDispose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(originalDispose).toHaveBeenCalledTimes(1);
      expect(state.tabs.tabs.value.some((tab) => tab.id === tabId)).toBe(false);
      expect(state.app.currentToast.value?.message).toBe(
        "The host left — you were removed from the session"
      );
    });

    it("cancels the pending removal and shows a reconnected toast if the host reappears before the grace period elapses", async () => {
      const state = await createStateWithTwoTabs();
      const { session, originalDispose } = await joinAsHostedSession(
        state,
        "session-recover"
      );
      const tabId = state.tabs.tabs.value.find(
        (tab) => tab.sharedSession === session
      )!.id;

      session.connectedUsers.value = [selfConnectedUser];
      vi.advanceTimersByTime(15_000);

      session.connectedUsers.value = [selfConnectedUser, hostConnectedUser];
      expect(state.app.currentToast.value?.message).toBe(
        "Reconnected to the session"
      );

      vi.advanceTimersByTime(20_000);

      expect(originalDispose).not.toHaveBeenCalled();
      expect(state.tabs.tabs.value.some((tab) => tab.id === tabId)).toBe(true);
    });

    it("does not close the tab if this client's connection goes unsynced while the timer is pending", async () => {
      const state = await createStateWithTwoTabs();
      const { session, originalDispose } = await joinAsHostedSession(
        state,
        "session-resync"
      );
      const tabId = state.tabs.tabs.value.find(
        (tab) => tab.sharedSession === session
      )!.id;

      session.connectedUsers.value = [selfConnectedUser];
      vi.advanceTimersByTime(1000);
      // This client's own connection drops mid-wait (e.g. the phone was
      // backgrounded right after the host first looked gone). The host is
      // still absent from `connectedUsers`, but that reading is no longer
      // trustworthy.
      session.isSynced.value = false;

      vi.advanceTimersByTime(29_000);

      expect(originalDispose).not.toHaveBeenCalled();
      expect(state.tabs.tabs.value.some((tab) => tab.id === tabId)).toBe(true);
    });

    it("suppresses arming the timer for a short window right after the tab returns to the foreground", async () => {
      const state = await createStateWithTwoTabs();
      const { session, originalDispose } = await joinAsHostedSession(
        state,
        "session-resume"
      );

      document.dispatchEvent(new Event("visibilitychange"));

      session.connectedUsers.value = [selfConnectedUser];
      expect(state.app.currentToast.value).toBeNull();

      vi.advanceTimersByTime(4999);
      expect(state.app.currentToast.value).toBeNull();
      expect(originalDispose).not.toHaveBeenCalled();

      // The post-resume grace window has now elapsed, so the effect re-runs
      // and arms the timer.
      vi.advanceTimersByTime(1);
      expect(state.app.currentToast.value?.message).toBe(
        "Reconnecting to the session…"
      );

      vi.advanceTimersByTime(30_000);
      expect(originalDispose).toHaveBeenCalledTimes(1);
    });

    // Regression test for the two-device repro in #1346: after the guest
    // backgrounded and resumed, the OS stopped reporting presence entirely
    // (the list went empty and never recovered, self included) while the
    // document itself kept syncing. The host had not left, so the guest must
    // not be ejected on the strength of that empty list.
    it("never closes the tab when the presence list is empty because the presence channel itself is broken", async () => {
      const state = await createStateWithTwoTabs();
      const { session, originalDispose } = await joinAsHostedSession(
        state,
        "session-presence-broken"
      );
      const tabId = state.tabs.tabs.value.find(
        (tab) => tab.sharedSession === session
      )!.id;

      // The document resynced fine (navigation still works)...
      session.isSynced.value = true;
      // ...but presence went silent: nobody is listed, not even ourselves,
      // even though we are obviously still here.
      session.connectedUsers.value = [];

      vi.advanceTimersByTime(120_000);

      expect(originalDispose).not.toHaveBeenCalled();
      expect(state.tabs.tabs.value.some((tab) => tab.id === tabId)).toBe(true);
      expect(state.app.currentToast.value).toBeNull();
    });
  });

  it("tabs can be opened in new slots", async () => {
    const state = await createStateWithTwoTabs();

    state.app.openInNewSlot("tab-2");

    expect(state.tabsLayout.slots.value).toHaveLength(2);
    expect(
      state.tabsLayout.slots.value.some((slot) => slot.tab?.id === "tab-2")
    ).toBe(true);
    expect(state.tabs.selectedTabId.value).toBe("tab-2");
  });

  it("opens an independent, hidden tab in a new slot when the tab is already shown in the current slot", async () => {
    const state = await createState();
    // The single slot shows the selected tab (tab-1).
    expect(state.tabsLayout.slots.value).toHaveLength(1);
    expect(state.tabsLayout.slots.value[0]?.tab?.id).toBe("tab-1");

    state.app.openInNewSlot("tab-1");

    // A second slot appears, bound to a *different* tab so it is not
    // de-duplicated away (would leave an empty slot) and so chapter navigation
    // moves only one slot (independent reading states).
    expect(state.tabsLayout.slots.value).toHaveLength(2);
    const tabIds = state.tabsLayout.slots.value.map(
      (slot) => slot.tab?.id ?? null
    );
    expect(tabIds.every((id) => id !== null)).toBe(true);
    expect(new Set(tabIds).size).toBe(2);

    // The cloned tab is slot-only (hidden from the tab strip): the user still
    // sees a single visible tab.
    const visibleTabs = state.tabs.tabs.value.filter((tab) => !tab.slotOnly);
    expect(visibleTabs).toHaveLength(1);
    expect(visibleTabs[0]?.id).toBe("tab-1");
  });

  it("selecting a slot that has a tab also selects the tab for the slot", async () => {
    const state = await createStateWithTwoTabs();

    state.tabsLayout.setLayout("split-2v");
    const secondSlot = state.tabsLayout.slots.value[1]!;
    state.tabsLayout.openTabInSlot(secondSlot.id, "tab-2");

    state.app.selectSlot(secondSlot.id);

    expect(state.tabsLayout.selectedSlotId.value).toBe(secondSlot.id);
    expect(state.tabs.selectedTabId.value).toBe("tab-2");
  });

  it("selecting a pane only selects it, without affecting the selector or tab selection", async () => {
    const state = await createState();
    const pane = state.panes.openPane({
      placement: "side",
      title: "Test Pane",
      component: () => null,
    });
    const previousSelectedTabId = state.tabs.selectedTabId.value;

    state.app.selectPane(pane.id);

    expect(state.panes.selectedPaneId.value).toBe(pane.id);
    expect(state.tabs.selectedTabId.value).toBe(previousSelectedTabId);
    expect(state.selector.isOpen.value).toBe(false);
  });

  it("closes a fullscreen pane when navigating to a new chapter", async () => {
    jsdom.reconfigure({ url: "https://example.com?useFreeBibleAPI=true" });
    const state = await createState();
    const readingState = state.tabs.tabs.value[0]!.readingState;
    await waitFor(() => readingState.chapterData.value !== null);

    state.panes.openPane({
      placement: "fullscreen",
      title: "Fullscreen Pane",
      component: () => null,
    });
    expect(state.panes.panes.value).toHaveLength(1);

    await readingState.selectChapter("EXO", 2);
    await waitFor(() => readingState.bookId.value === "EXO");

    expect(state.panes.panes.value).toHaveLength(0);
  });

  describe("mobile tab slot restrictions", () => {
    // isMobile is derived from viewportWidth; the returned signal is the same
    // writable instance, so tests drive the mobile layout by writing to it.
    const setViewportWidth = (state: SeedBibleState, width: number) => {
      (state.app.viewportWidth as unknown as { value: number }).value = width;
    };

    it("shows a single slot, never stacked, on mobile", async () => {
      const state = await createState();
      // A four-slot desktop layout leaves four slots in the manager.
      state.tabsLayout.setLayout("grid-2x2");
      expect(state.tabsLayout.slots.value).toHaveLength(4);

      setViewportWidth(state, 400);

      expect(state.app.effectiveSlots.value).toHaveLength(1);
      expect(state.app.effectiveSlotLayout.value).toBe("single");

      // The manager's own layout/slots are left untouched so they are
      // restored on desktop.
      expect(state.tabsLayout.layout.value).toBe("grid-2x2");
      expect(state.tabsLayout.slots.value).toHaveLength(4);
    });

    it("uses the single layout on mobile when only one slot exists", async () => {
      const state = await createState();
      setViewportWidth(state, 400);

      expect(state.app.effectiveSlots.value).toHaveLength(1);
      expect(state.app.effectiveSlotLayout.value).toBe("single");
    });

    it("restores the desktop layout when the viewport grows back", async () => {
      const state = await createState();
      state.tabsLayout.setLayout("grid-2x2");

      setViewportWidth(state, 400);
      expect(state.app.effectiveSlotLayout.value).toBe("single");
      expect(state.app.effectiveSlots.value).toHaveLength(1);

      setViewportWidth(state, 1200);
      expect(state.app.effectiveSlotLayout.value).toBe("grid-2x2");
      expect(state.app.effectiveSlots.value).toHaveLength(4);
    });

    it("shows a single slot matching the selected tab when panels are disabled", async () => {
      const state = await createStateWithTwoTabs();
      state.tabsLayout.setLayout("split-2v");
      const secondSlot = state.tabsLayout.slots.value[1]!;
      state.tabsLayout.openTabInSlot(secondSlot.id, "tab-2");
      state.app.selectTab("tab-2");

      state.settings.setDisablePanels(true);

      expect(state.app.panelsEnabled.value).toBe(false);
      expect(state.app.effectiveSlots.value).toHaveLength(1);
      expect(state.app.effectiveSlots.value[0]?.tab?.id).toBe("tab-2");
    });
  });

  describe("mobile pane placement remap", () => {
    const setViewportWidth = (state: SeedBibleState, width: number) => {
      (state.app.viewportWidth as unknown as { value: number }).value = width;
    };

    it("remaps side/floating panes to fullscreen on mobile without changing the stored placement", async () => {
      const state = await createState();
      const sidePane = state.panes.openPane({
        placement: "side",
        title: "Side Pane",
        component: () => null,
      });

      setViewportWidth(state, 400);

      const effectivePane = state.app.effectivePanes.value.find(
        (pane) => pane.id === sidePane.id
      );
      expect(effectivePane?.placement).toBe("fullscreen");

      // The manager's own stored placement is untouched, so it snaps back
      // when the viewport grows back to a desktop size.
      const storedPane = state.panes.panes.value.find(
        (pane) => pane.id === sidePane.id
      );
      expect(storedPane?.placement).toBe("side");

      setViewportWidth(state, 1200);
      const restoredPane = state.app.effectivePanes.value.find(
        (pane) => pane.id === sidePane.id
      );
      expect(restoredPane?.placement).toBe("side");
    });

    it("leaves fullscreen panes unchanged on mobile", async () => {
      const state = await createState();
      const fullscreenPane = state.panes.openPane({
        placement: "fullscreen",
        title: "Fullscreen Pane",
        component: () => null,
      });

      setViewportWidth(state, 400);

      const effectivePane = state.app.effectivePanes.value.find(
        (pane) => pane.id === fullscreenPane.id
      );
      expect(effectivePane?.placement).toBe("fullscreen");
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
      (globalThis as any).posthog = {
        capture: mockPosthogCapture,
        onFeatureFlags: vi.fn(),
      };
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
        className: "sb-verse-decoration-diminish",
        containerClassName: "sb-chapter-decoration-diminish",
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
        className: "sb-verse-decoration-diminish",
        containerClassName: "sb-chapter-decoration-diminish",
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

  describe("automatic sign-out toast", () => {
    it("shows nothing while the session is intact", async () => {
      const state = await createState();

      expect(state.app.currentToast.value).toBe(null);
    });

    it("explains a session that ended on its own", async () => {
      const state = await createState();

      state.login.sessionEnded.value = { reason: "signed_out", id: 1 };

      expect(state.app.currentToast.value?.message).toBe(
        "You've been signed out. Please sign in again."
      );
    });

    it("explains a suspended account", async () => {
      const state = await createState();

      state.login.sessionEnded.value = { reason: "account_suspended", id: 1 };

      expect(state.app.currentToast.value?.message).toBe(
        "Your account has been suspended."
      );
    });

    it("shows a fresh toast for a second sign-out with the same reason", async () => {
      // The event carries a monotonic id precisely so this case still notifies: a
      // bare reason string would be `===` the previous value, so the effect would
      // never re-run and the message would be silently swallowed.
      const state = await createState();

      state.login.sessionEnded.value = { reason: "signed_out", id: 1 };
      const firstToastId = state.app.currentToast.value?.id;

      state.login.sessionEnded.value = { reason: "signed_out", id: 2 };

      expect(state.app.currentToast.value?.id).not.toBe(firstToastId);
    });
  });

  describe("annotationRecordKey", () => {
    it("passes the annotationRecordKey URL param to the annotations manager, so it is used as the record name instead of requiring sign-in", async () => {
      jsdom.reconfigure({
        url: "https://example.com?annotationRecordKey=custom-record",
      });
      const state = await createState();
      const recordDataSpy = vi
        .spyOn(state.os, "recordData")
        .mockResolvedValue({ success: true } as any);
      const loginSpy = vi.spyOn(state.login, "login");

      await state.annotations.saveAnnotation({
        id: "ann-1",
        bookId: "GEN",
        chapterNumber: 1,
        data: { type: "comment", html: "<p>Hi</p>" },
      });

      // Never had to sign in because the override short-circuits the lookup
      // that would otherwise fall back to the signed-in user's id.
      expect(loginSpy).not.toHaveBeenCalled();
      expect(recordDataSpy).toHaveBeenCalledWith(
        "custom-record",
        "ann-1",
        expect.any(Object),
        { marker: "publicRead:annotations/GEN/1" }
      );
    });

    it("uses the annotationRecordKey URL param when listing annotations for a chapter", async () => {
      jsdom.reconfigure({
        url: "https://example.com?annotationRecordKey=custom-record",
      });
      const state = await createState();
      const listDataByMarkerSpy = vi
        .spyOn(state.os, "listDataByMarker")
        .mockResolvedValue({ success: true, items: [] } as any);

      await state.annotations.listAnnotationsForChapter("GEN", 1);

      expect(listDataByMarkerSpy).toHaveBeenCalledWith(
        "custom-record",
        "publicRead:annotations/GEN/1",
        undefined
      );
    });

    it("keeps a saved annotation visible in getAnnotationsForChapter - the reactive view the UI actually renders from", async () => {
      jsdom.reconfigure({
        url: "https://example.com?annotationRecordKey=custom-record",
      });
      const state = await createState();
      vi.spyOn(state.os, "recordData").mockResolvedValue({
        success: true,
      } as any);
      const loginSpy = vi.spyOn(state.login, "login");

      state.annotations.editAnnotation({
        id: "ann-1",
        bookId: "GEN",
        chapterNumber: 1,
        data: { type: "comment", html: "<p>Hi</p>" },
      });
      await state.annotations.saveEditingAnnotation();

      // Never had to sign in, and the just-saved note shows up through the
      // same reactive view the annotation pane renders from - not just
      // through the low-level listAnnotationsForChapter/saveAnnotation calls.
      expect(loginSpy).not.toHaveBeenCalled();
      expect(
        state.annotations
          .getAnnotationsForChapter("GEN", 1)
          .value.map((a) => a.id)
      ).toEqual(["ann-1"]);
    });
  });

  // Shared by the pageTitle and meta-description suites: both read signals
  // derived from the selected tab's loaded chapter.
  function setSelectedTabChapter(
    state: SeedBibleState,
    bookId: string,
    bookName: string,
    chapterNumber: number,
    translationName = "Test Translation",
    textDirection: "ltr" | "rtl" = "ltr",
    extra: {
      content?: unknown[];
      shortName?: string;
    } = {}
  ) {
    const tab =
      state.tabs.tabs.value.find(
        (t) => t.id === state.tabs.selectedTabId.value
      ) ?? null;
    expect(tab).not.toBeNull();
    // Batched, and with translationId set to match chapterData.translation.id,
    // so the reading-state effect that watches translationId/bookId/chapterNumber
    // (and re-fetches content whenever they don't match chapterData) sees a
    // fully consistent position and never issues a real network request.
    batch(() => {
      tab!.readingState.translationId.value = "test-translation";
      tab!.readingState.bookId.value = bookId;
      tab!.readingState.chapterNumber.value = chapterNumber;
      tab!.readingState.chapterData.value = {
        translation: {
          id: "test-translation",
          name: translationName,
          shortName: extra.shortName ?? translationName,
          textDirection,
        },
        book: { id: bookId, name: bookName, abbreviation: bookId },
        chapter: {
          number: chapterNumber,
          id: `${bookId}-${chapterNumber}`,
          reference: `${bookName} ${chapterNumber}`,
          content: extra.content,
        },
        verses: [],
        notes: [],
      } as any;
    });
  }

  describe("pageTitle tag", () => {
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

  describe("meta description", () => {
    const GENESIS_1 = [
      { type: "heading", content: ["The Creation"] },
      {
        type: "verse",
        number: 1,
        content: ["In the beginning God created the heavens and the earth."],
      },
      {
        type: "verse",
        number: 2,
        content: [
          "Now the earth was formless and void, and darkness was over the surface of the deep, and the Spirit of God was hovering over the surface of the waters.",
        ],
      },
    ];

    function graphemeCount(text: string): number {
      return [
        ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          text
        ),
      ].length;
    }

    it("leads with the reference and quotes the chapter", async () => {
      const state = await createState();

      setSelectedTabChapter(
        state,
        "genesis",
        "Genesis",
        1,
        "Berean Standard Bible",
        "ltr",
        {
          content: GENESIS_1,
          shortName: "BSB",
        }
      );

      expect(state.app.description.value).toBe(
        "Genesis 1 (BSB): In the beginning God created the heavens and the earth. Now the earth was formless and void, and darkness was over the surface of the…"
      );
    });

    it("stays within the snippet budget and emits no verse numbers", async () => {
      const state = await createState();

      setSelectedTabChapter(state, "genesis", "Genesis", 1, "BSB", "ltr", {
        content: GENESIS_1,
        shortName: "BSB",
      });

      const description = state.app.description.value;
      expect(graphemeCount(description)).toBeLessThanOrEqual(155);
      // The only digit allowed is the chapter number in the reference.
      expect(description.replace("Genesis 1 (BSB):", "")).not.toMatch(/\d/);
    });

    it("skips the section heading rather than leading with it", async () => {
      const state = await createState();

      setSelectedTabChapter(state, "genesis", "Genesis", 1, "BSB", "ltr", {
        content: GENESIS_1,
        shortName: "BSB",
      });

      expect(state.app.description.value).not.toContain("The Creation");
    });

    it("describes the app, not just its name, when no chapter is loaded", async () => {
      const state = await createState();

      const description = state.app.description.value;

      // Regression guard: this used to emit the bare site name as the
      // description, which tells a search engine nothing.
      expect(description).not.toBe("Seed Bible");
      expect(description).toContain("study the Bible online");
    });

    it("falls back to the reference when the chapter has no quotable text", async () => {
      const state = await createState();

      setSelectedTabChapter(state, "genesis", "Genesis", 1, "BSB", "ltr", {
        content: [{ type: "line_break" }],
        shortName: "BSB",
      });

      expect(state.app.description.value).toBe(
        "Read Genesis 1 in the Seed Bible"
      );
    });

    it("falls back to the reference when chapter content is missing entirely", async () => {
      const state = await createState();

      setSelectedTabChapter(state, "genesis", "Genesis", 1, "BSB");

      expect(state.app.description.value).toBe(
        "Read Genesis 1 in the Seed Bible"
      );
    });

    // Book names come from each translation's own catalog, not a fixed short
    // label, so this branch has no inherent length ceiling either.
    it("bounds the reference-only fallback for a very long book name", async () => {
      const state = await createState();
      const longBookName =
        "The First Book of Moses Commonly Called Genesis Together With Extended Introductory Commentary And Translator Notes For The Attentive Reader Of Scripture";

      setSelectedTabChapter(state, "genesis", longBookName, 1, "BSB", "ltr", {
        content: [{ type: "line_break" }],
        shortName: "BSB",
      });

      const description = state.app.description.value;

      expect(graphemeCount(description)).toBeLessThanOrEqual(155);
      expect(description.endsWith("…")).toBe(true);
    });

    // Only observable with a reordered template: with the citation charged
    // against the budget up front, the excerpt absorbs the cut. Truncating the
    // composed string alone would chop the citation off the end instead.
    it("cuts scripture, not the citation, when the template ends with the citation", async () => {
      const state = await createState();
      const i18next = (await import("i18next")).default;
      const EN_DEFAULT =
        "{{bookName}} {{chapterNumber}} ({{translationName}}): {{excerpt}}";

      i18next.addResource(
        "en",
        "seed-bible",
        "chapter-meta-description",
        "「{{excerpt}}」— {{bookName}} {{chapterNumber}} ({{translationName}})"
      );

      try {
        setSelectedTabChapter(state, "genesis", "Genesis", 1, "Berean", "ltr", {
          content: GENESIS_1,
          shortName: "BSB",
        });

        const description = state.app.description.value;

        expect(description).toContain("— Genesis 1 (BSB)");
        expect(description.endsWith("(BSB)")).toBe(true);
        expect(graphemeCount(description)).toBeLessThanOrEqual(155);
      } finally {
        i18next.addResource(
          "en",
          "seed-bible",
          "chapter-meta-description",
          EN_DEFAULT
        );
      }
    });
  });

  describe("tab state persistence", () => {
    interface StoredTabsState {
      tabs: { id: string; slotOnly?: boolean }[];
      selectedTabId: string;
      layout: string;
      slotTabIds: (string | null)[];
      selectedSlotIndex: number | null;
    }

    const readStoredTabs = (): StoredTabsState =>
      JSON.parse(localStorage.getItem("sb-tabs-state") ?? "null");

    // SettingsManager reads the anonymous, device-only config store
    // (`login.localConfig`) from this key, so writing it before a bootstrap is
    // how a test simulates opening the app with panels off/on.
    const setPanelsDisabled = (disablePanels: boolean) =>
      localStorage.setItem(
        "sb-profile-config-local",
        JSON.stringify({ disablePanels })
      );

    const openSecondPane = async (state: SeedBibleState) => {
      const slot = state.tabsLayout.openTabInNewSlot(
        state.tabsLayout.slots.value[0]!.tab!.id
      );
      const clone = state.tabs.tabs.value.find(
        (tab) => tab.id === slot?.tab?.id
      )!;
      await waitForInitialLoad(clone.readingState, 1000);
    };

    it("stores the split layout together with the hidden clone backing it", async () => {
      const state = await createState();

      await openSecondPane(state);

      const stored = readStoredTabs();
      expect(stored.layout).toBe("split-2v");
      expect(stored.slotTabIds).toHaveLength(2);
      expect(stored.slotTabIds.every((id) => typeof id === "string")).toBe(
        true
      );
      // The second pane is backed by a hidden clone. Without it in `tabs`, the
      // restored pane would resolve to no tab and come back empty.
      expect(stored.tabs.filter((tab) => tab.slotOnly)).toHaveLength(1);
    });

    it("keeps a stored split through a load with panels disabled", async () => {
      // 1. Build a two-pane split with panels enabled.
      const withPanels = await createState();
      await openSecondPane(withPanels);
      expect(readStoredTabs().slotTabIds).toHaveLength(2);

      // 2. Reload with panels disabled.
      setPanelsDisabled(true);
      const panelsOff = await createState();
      expect(panelsOff.app.panelsEnabled.value).toBe(false);

      // The rendered view collapses to a single pane...
      expect(panelsOff.app.effectiveSlotLayout.value).toBe("single");
      expect(panelsOff.app.effectiveSlots.value).toHaveLength(1);
      // ...but the layout manager still holds the split, so that is what the
      // persistence effect writes back. Collapsing it here instead would
      // overwrite storage with a single pane and destroy the split for good.
      expect(panelsOff.tabsLayout.layout.value).toBe("split-2v");
      expect(panelsOff.tabsLayout.slots.value).toHaveLength(2);
      expect(readStoredTabs().slotTabIds).toHaveLength(2);

      // 3. Re-enable panels and reload: the split renders again.
      setPanelsDisabled(false);
      const panelsBackOn = await createState();
      expect(panelsBackOn.app.panelsEnabled.value).toBe(true);
      expect(panelsBackOn.app.effectiveSlotLayout.value).toBe("split-2v");
      expect(panelsBackOn.app.effectiveSlots.value).toHaveLength(2);
      expect(
        panelsBackOn.app.effectiveSlots.value.map((slot) => slot.tab?.id)
      ).toEqual(readStoredTabs().slotTabIds);
    });
  });

  describe("UI language Bible translation switch", () => {
    beforeEach(async () => {
      // Language changes share the process-wide i18n instance; reset so each
      // case starts from English defaults rather than the prior test's locale.
      const i18nMod = await import("i18next");
      if (i18nMod.default.isInitialized && i18nMod.default.language !== "en") {
        await i18nMod.default.changeLanguage("en");
      }
    });

    it("keeps the current book and chapter when the new translation has that book", async () => {
      const state = await createStateWithOptions({
        responses: createLanguageSwitchResponses(),
      });
      const readingState = state.tabs.tabs.value[0]!.readingState;

      await readingState.selectChapter("EXO", 2);
      await waitForInitialLoad(readingState, 1000);
      expect(readingState.bookId.value).toBe("EXO");
      expect(readingState.chapterNumber.value).toBe(2);

      await state.i18n.requestLanguageChange("es");
      await waitForInitialLoad(readingState, 1000);

      expect(readingState.translationId.value).toBe("spa_onbv");
      expect(readingState.bookId.value).toBe("EXO");
      expect(readingState.chapterNumber.value).toBe(2);
    });

    it("passes the selected verse through when switching translation", async () => {
      const state = await createStateWithOptions({
        responses: createLanguageSwitchResponses(),
      });
      const readingState = state.tabs.tabs.value[0]!.readingState;

      await readingState.selectChapter("EXO", 2);
      await waitForInitialLoad(readingState, 1000);

      const chapter = readingState.chapterData.value!;
      const verseEntry = chapter.chapter.content.find(
        (entry) =>
          !!entry &&
          typeof entry === "object" &&
          (entry as { type?: string }).type === "verse" &&
          (entry as { number?: number }).number === 2
      );
      expect(verseEntry).toBeTruthy();

      readingState.selectVerse(
        {
          bookId: "EXO",
          chapterNumber: 2,
          verse: verseEntry as (typeof chapter.chapter.content)[number] & {
            type: "verse";
            number: number;
          },
          translationId: "AAB",
        },
        0,
        0
      );
      expect(readingState.selectedVerses.value).toHaveLength(1);

      const selectTranslationAndChapterSpy = vi.spyOn(
        readingState,
        "selectTranslationAndChapter"
      );

      await state.i18n.requestLanguageChange("es");
      await waitForInitialLoad(readingState, 1000);

      expect(selectTranslationAndChapterSpy).toHaveBeenCalledWith(
        "spa_onbv",
        "EXO",
        2,
        { scrollToVerse: 2 }
      );
      expect(readingState.translationId.value).toBe("spa_onbv");
      expect(readingState.bookId.value).toBe("EXO");
      expect(readingState.chapterNumber.value).toBe(2);
    });

    it("falls back to the first book when the new translation lacks the current book", async () => {
      const spaMatOnly = booksForTranslation(nivBooks, SPA_TRANSLATION);
      const state = await createStateWithOptions({
        responses: {
          ...createLanguageSwitchResponses({ spaBooks: spaMatOnly }),
          [privateUrl("/api/AAB/EXO/1.json")]: createResponse(
            makeChapter(aabBooks, "EXO", 1)
          ),
        },
      });
      const readingState = state.tabs.tabs.value[0]!.readingState;

      // Start on a book spa_onbv does not contain.
      await readingState.selectTranslationAndChapter("AAB", "EXO", 1);
      await waitForInitialLoad(readingState, 1000);
      expect(readingState.translationId.value).toBe("AAB");
      expect(readingState.bookId.value).toBe("EXO");

      await state.i18n.requestLanguageChange("es");
      await waitForInitialLoad(readingState, 1000);

      expect(readingState.translationId.value).toBe("spa_onbv");
      expect(readingState.bookId.value).toBe("MAT");
      expect(readingState.chapterNumber.value).toBe(1);
    });

    it("falls back to selectTranslation when the book catalog prefetch fails", async () => {
      const state = await createStateWithOptions({
        responses: createLanguageSwitchResponses(),
      });
      const readingState = state.tabs.tabs.value[0]!.readingState;

      await readingState.selectChapter("EXO", 2);
      await waitForInitialLoad(readingState, 1000);

      const selectTranslationSpy = vi.spyOn(readingState, "selectTranslation");
      const selectTranslationAndChapterSpy = vi.spyOn(
        readingState,
        "selectTranslationAndChapter"
      );
      // First call is the applicator's position-preserving prefetch; later
      // calls (from selectTranslation) should use the real catalog again.
      vi.spyOn(state.bibleData, "getTranslationBooks").mockRejectedValueOnce(
        new Error("network down")
      );

      await expect(
        state.i18n.requestLanguageChange("es")
      ).resolves.toBeUndefined();
      await waitForInitialLoad(readingState, 1000);

      expect(selectTranslationAndChapterSpy).not.toHaveBeenCalled();
      expect(selectTranslationSpy).toHaveBeenCalledWith("spa_onbv");
      expect(readingState.translationId.value).toBe("spa_onbv");
      // Degraded path: first book of the new translation, not EXO 2.
      expect(readingState.bookId.value).toBe("GEN");
      expect(readingState.chapterNumber.value).toBe(1);
    });

    it("keeps the current book and chapter when confirming a nearest-translation fallback", async () => {
      const state = await createStateWithOptions({
        responses: createLanguageSwitchResponses(),
      });
      const readingState = state.tabs.tabs.value[0]!.readingState;

      await readingState.selectChapter("EXO", 2);
      await waitForInitialLoad(readingState, 1000);

      // Gujarati has no Bible text; nearest is Hindi (hin_cvb).
      await state.i18n.requestLanguageChange("gu");
      expect(state.i18n.languageFallbackPrompt.value).toEqual({
        requestedLanguage: "gu",
        fallbackLanguage: "hi",
        fallbackTranslation: { id: "hin_cvb", language: "hin" },
      });

      await state.i18n.confirmLanguageFallback();
      await waitForInitialLoad(readingState, 1000);

      expect(readingState.translationId.value).toBe("hin_cvb");
      expect(readingState.bookId.value).toBe("EXO");
      expect(readingState.chapterNumber.value).toBe(2);
    });
  });

  describe("local chat scripture parsing", () => {
    // English book names resolve with no catalog at all, so an accented Spanish
    // name is the only text that can distinguish "books came from the selected
    // tab" from "the English-only fallback happened to match".
    function localizedSpaBooks(): TranslationBooks {
      const base = booksForTranslation(aabBooks, SPA_TRANSLATION);
      const spanishNames: Record<string, string> = {
        GEN: "Génesis",
        EXO: "Éxodo",
        MAT: "Mateo",
      };
      return {
        ...base,
        books: base.books.map((book) => ({
          ...book,
          name: spanishNames[book.id] ?? book.name,
          commonName: spanishNames[book.id] ?? book.commonName,
        })),
      };
    }

    it("resolves localized book names from the selected tab's translation", async () => {
      const state = await createStateWithOptions({
        responses: createLanguageSwitchResponses({
          spaBooks: localizedSpaBooks(),
        }),
      });
      const readingState = state.tabs.tabs.value[0]!.readingState;
      await readingState.selectTranslationAndChapter("spa_onbv", "GEN", 1);
      await waitForInitialLoad(readingState, 1000);

      const chat = state.chats.createLocalSession();
      await chat.sendMessage({ type: "text", text: "Ver Génesis 1:1" });

      expect(chat.parsedMessages.value[0]).toMatchObject({
        parts: [
          "Ver ",
          {
            type: "verse_reference",
            text: "Génesis 1:1",
            ref: { book: "GEN", chapter: 1, verse: 1 },
          },
        ],
      });
    });

    it("follows the selected tab when the user switches tabs", async () => {
      const state = await createStateWithOptions({
        responses: createLanguageSwitchResponses({
          spaBooks: localizedSpaBooks(),
        }),
      });
      const englishTabId = state.tabs.selectedTabId.value;
      const spanishTab = state.tabs.addTab();
      await waitForInitialLoad(spanishTab.readingState, 1000);
      await spanishTab.readingState.selectTranslationAndChapter(
        "spa_onbv",
        "GEN",
        1
      );
      await waitForInitialLoad(spanishTab.readingState, 1000);

      const chat = state.chats.createLocalSession();
      await chat.sendMessage({ type: "text", text: "Ver Génesis 1:1" });

      expect(chat.parsedMessages.value[0]).toMatchObject({
        parts: [
          "Ver ",
          {
            type: "verse_reference",
            ref: { book: "GEN", chapter: 1, verse: 1 },
          },
        ],
      });

      // Back on the English tab the same text is no longer a reference, which
      // is what proves the books are read from whichever tab is selected.
      state.tabs.selectTab(englishTabId);

      expect(chat.parsedMessages.value[0]).toMatchObject({
        parts: ["Ver Génesis 1:1"],
      });
    });
  });
});
