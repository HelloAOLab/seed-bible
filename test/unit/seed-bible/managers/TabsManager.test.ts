import {
  createTabs,
  formatVerseSelection,
  parseVerseSelection,
  type ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  createBibleReadingState,
  type BibleReadingState,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import * as BibleReadingManagerModule from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  EXAMPLE_API_ENDPOINT,
  type WebResponseMap,
  createExampleManagerResponseMap,
} from "./testUtils/mockBibleApiData";
import { signal } from "@preact/signals";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import type { Mock } from "vitest";
import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

let webGetMock: Mock;
let logSpy: Mock;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  webGetMock = vi.fn();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

  globalThis.fetch = webGetMock;
});

afterEach(() => {
  logSpy.mockRestore();
  // Clear any query params written by tab/URL sync effects so they don't
  // leak into the next test's initial tab state.
  window.history.replaceState(null, "", window.location.pathname);
  globalThis.fetch = originalFetch;
});

function setWebResponses(responses: WebResponseMap): void {
  webGetMock.mockImplementation((url: string) => {
    const response = responses[url];
    if (!response) {
      throw new Error(`No mocked response for ${url}`);
    }
    return Promise.resolve(response);
  });
}

function createApi(): FreeUseBibleAPI {
  return new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT);
}

function createDataManager() {
  return createBibleDataManager(createApi());
}

function createHighlightsManagerMock() {
  return {
    getChapterHighlights: vi.fn().mockReturnValue(signal({ highlights: [] })),
  };
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

async function waitForInitialLoad(state: BibleReadingState): Promise<void> {
  await waitFor(() => state.loading.value === false);
}

async function waitForTabsToLoad(tabs: ReaderTab[]): Promise<void> {
  await Promise.all(tabs.map((tab) => waitForInitialLoad(tab.readingState)));
}

describe("formatVerseSelection", () => {
  it("returns null for empty input", () => {
    expect(formatVerseSelection([])).toBeNull();
  });

  it("returns a single verse number when only one valid verse remains", () => {
    expect(formatVerseSelection([3, 3, -1, 0, Number.NaN])).toBe("3");
  });

  it("returns a range for consecutive verses regardless of input order", () => {
    expect(formatVerseSelection([5, 3, 4, 2])).toBe("2-5");
  });

  it("returns a comma-separated list for non-consecutive verses", () => {
    expect(formatVerseSelection([3, 1, 7, 3])).toBe("1,3,7");
  });

  it("filters invalid values and still formats the remaining verses", () => {
    expect(formatVerseSelection([1, 2, Number.POSITIVE_INFINITY, -5, 0])).toBe(
      "1-2"
    );
  });
});

describe("parseVerseSelection", () => {
  it("parses a single verse", () => {
    expect(parseVerseSelection("3")).toEqual([3]);
  });

  it("parses a simple range", () => {
    expect(parseVerseSelection("2-5")).toEqual([2, 3, 4, 5]);
  });

  it("parses mixed single verses and ranges", () => {
    expect(parseVerseSelection("1,3-4,7")).toEqual([1, 3, 4, 7]);
  });

  it("ignores invalid ranges", () => {
    expect(parseVerseSelection("5-3,2-2,4-a")).toEqual([2]);
  });

  it("keeps duplicates and preserves order", () => {
    expect(parseVerseSelection("1,1,2-3,2")).toEqual([1, 1, 2, 3, 2]);
  });

  it("supports whitespace around comma and range separators", () => {
    expect(parseVerseSelection(" 1 , 2 - 3 , 4 ")).toEqual([1, 2, 3, 4]);
  });

  it("returns empty array for completely invalid input", () => {
    expect(parseVerseSelection("abc")).toEqual([]);
  });
});

function createTabsManager({
  dataManager: data,
  i18nManager: i18n,
}: {
  dataManager?: ReturnType<typeof createDataManager>;
  i18nManager?: ReturnType<typeof createI18nManager>;
} = {}) {
  const navigation = createNavigationManager();
  const dataManager = data || createDataManager();
  const highlightsManager = createHighlightsManagerMock() as any;
  const i18nManager = i18n || createI18nManager(navigation, ["en"]);
  const tabs = createTabs(
    navigation,
    dataManager,
    highlightsManager,
    i18nManager
  );

  return { navigation, dataManager, highlightsManager, i18nManager, tabs };
}

describe("createTabs", () => {
  it("addTab() creates a new tab with new reading state", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const existingReadingStates = manager.tabs.value.map(
      (tab) => tab.readingState
    );

    const nextTab = manager.addTab();
    await waitForInitialLoad(nextTab.readingState);

    expect(manager.tabs.value).toHaveLength(2);
    expect(manager.tabs.value[1]).toBe(nextTab);
    // Checked via .includes() because chai's toContain eagerly inspect()s the
    // needle for its message and crashes on the reading state's
    // null-prototype module objects.
    expect(existingReadingStates.includes(nextTab.readingState)).toBe(false);
    expect(nextTab.id).toBe("tab-2");
    expect(nextTab.title).toBe("Tab 2");
    expect(nextTab.sharedSession).toBeNull();
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("addTab() accepts a shared reading session for the new tab", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const sharedSession = {
      id: "session-123",
      readingState: manager.tabs.value[0]!.readingState,
      document: {} as SharedDocument,
      options: signal({
        allowedNavigators: null,
        allowedDecorators: null,
        hostUserId: null,
        highlightDurationSeconds: 16,
        endedAt: null,
      }),
      updateOptions: vi.fn(),
      removeSharedDecoration: vi.fn(),
      dispose: vi.fn(),
      connectedUsers: signal([]),
      localSessionId: signal("session-123"),
      userCanDecorate: vi.fn().mockReturnValue(true),
      userCanNavigate: vi.fn().mockReturnValue(true),
    } as BibleReadingSession;

    const nextTab = manager.addTab(sharedSession);

    expect(nextTab.readingState).toBe(sharedSession.readingState);
    expect(nextTab.sharedSession).toBe(sharedSession);
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("addTab() accepts a reading state for the new tab", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, dataManager, i18nManager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = createBibleReadingState(
      dataManager,
      createHighlightsManagerMock() as any,
      i18nManager
    );

    const nextTab = manager.addTab(readingState);

    expect(nextTab.readingState).toBe(readingState);
    expect(nextTab.sharedSession).toBeNull();
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("removeTab() removes the given tab", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    manager.removeTab("tab-2");

    expect(manager.tabs.value).toHaveLength(1);
    expect(manager.tabs.value.some((tab) => tab.id === "tab-2")).toBe(false);
  });

  it("selectTab() sets the selected tab", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    manager.selectTab("tab-2");

    expect(manager.selectedTabId.value).toBe("tab-2");
  });

  it("syncs the selected tab to match the URL", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);
    const secondTab = manager.addTab();
    await waitForInitialLoad(secondTab.readingState);
    manager.selectTab(secondTab.id);

    navigation.push("?translation=NIV&book=MAT&chapter=1");

    const selectedTab = manager.tabs.value.find(
      (tab) => tab.id === manager.selectedTabId.value
    );
    expect(selectedTab).toBeDefined();
    await waitFor(
      () => selectedTab!.readingState.translationId.value === "NIV"
    );
    await waitForInitialLoad(selectedTab!.readingState);

    expect(selectedTab!.readingState.translationId.value).toBe("NIV");
    expect(selectedTab!.readingState.bookId.value).toBe("MAT");
    expect(selectedTab!.readingState.chapterNumber.value).toBe(1);
  });

  it("reuses the translationId URL param instead of writing the translation param", async () => {
    window.history.replaceState(null, "", "?translationId=NIV&book=MAT");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const url = new URL(window.location.href);
    expect(url.searchParams.get("translationId")).toBe("NIV");
    expect(url.searchParams.get("translation")).toBeNull();
  });

  it("prioritizes the translationId URL param over the translation param for the initial tab", async () => {
    window.history.replaceState(
      null,
      "",
      "?translationId=NIV&translation=AAB&book=MAT&chapter=1"
    );
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const firstTab = manager.tabs.value[0]!;
    expect(firstTab.readingState.translationId.value).toBe("NIV");
  });

  it("saves a full custom-endpoint URL to the translation URL param", async () => {
    window.history.replaceState(
      null,
      "",
      "?translation=NIV&book=MAT&chapter=1"
    );
    setWebResponses(createExampleManagerResponseMap());

    const dataManager = createDataManager();
    const customTranslationUrl = "https://alt.example/api/NIV/books.json";
    const buildTranslationIdSpy = vi
      .spyOn(dataManager, "buildTranslationId")
      .mockReturnValue(customTranslationUrl);

    const { tabs: manager } = createTabsManager({ dataManager });
    await waitForTabsToLoad(manager.tabs.value);

    await waitFor(
      () =>
        new URL(window.location.href).searchParams.get("translation") ===
        customTranslationUrl
    );
    const url = new URL(window.location.href);
    expect(url.searchParams.get("translationId")).toBeNull();
    expect(url.searchParams.get("translation")).toBe(customTranslationUrl);
    expect(buildTranslationIdSpy).toHaveBeenCalledWith("NIV");
  });

  // TODO: Selected-verse -> URL syncing has not been reimplemented in the
  // standalone TabsManager (only the initial `?verse` read exists; see the
  // "TODO: Update the URL here" effect in TabsManager). Re-enable these once
  // the sync is added.
  it.skip("updates the verse URL param from selected verses in the current chapter", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;
    const currentBookId = readingState.bookId.value;
    const currentChapter = readingState.chapterNumber.value;

    readingState.selectedVerses.value = [
      {
        bookId: currentBookId,
        chapterNumber: currentChapter,
        verse: { number: 3 },
      } as any,
      {
        bookId: currentBookId,
        chapterNumber: currentChapter,
        verse: { number: 1 },
      } as any,
      {
        bookId: currentBookId,
        chapterNumber: currentChapter + 1,
        verse: { number: 2 },
      } as any,
    ];

    await waitFor(() => (globalThis as any).configBot.tags.verse === "1,3");
    expect((globalThis as any).configBot.tags.verse).toBe("1,3");
  });

  it.skip("clears the verse URL param when selected verses become empty", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;
    const currentBookId = readingState.bookId.value;
    const currentChapter = readingState.chapterNumber.value;

    readingState.selectedVerses.value = [
      {
        bookId: currentBookId,
        chapterNumber: currentChapter,
        verse: { number: 4 },
      } as any,
    ];
    await waitFor(() => (globalThis as any).configBot.tags.verse === "4");

    readingState.selectedVerses.value = [];

    await waitFor(() => (globalThis as any).configBot.tags.verse === null);
    expect((globalThis as any).configBot.tags.verse).toBeNull();
  });

  it.skip("uses selected tab verses when syncing the verse URL param", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const firstReadingState = manager.tabs.value[0]!.readingState;
    const firstBookId = firstReadingState.bookId.value;
    const firstChapter = firstReadingState.chapterNumber.value;
    firstReadingState.selectedVerses.value = [
      {
        bookId: firstBookId,
        chapterNumber: firstChapter,
        verse: { number: 2 },
      } as any,
    ];
    await waitFor(() => (globalThis as any).configBot.tags.verse === "2");

    const secondTab = manager.addTab();
    await waitForInitialLoad(secondTab.readingState);
    const secondBookId = secondTab.readingState.bookId.value;
    const secondChapter = secondTab.readingState.chapterNumber.value;
    secondTab.readingState.selectedVerses.value = [
      {
        bookId: secondBookId,
        chapterNumber: secondChapter,
        verse: { number: 6 },
      } as any,
    ];

    await waitFor(() => (globalThis as any).configBot.tags.verse === "6");
    expect((globalThis as any).configBot.tags.verse).toBe("6");
  });

  it("decorates initial verses from the verse URL param on the initial tab", async () => {
    window.history.replaceState(null, "", "?book=GEN&chapter=1&verse=3,5-6");
    setWebResponses(createExampleManagerResponseMap());

    let decorateVersesSpy: Mock | null = null;
    const originalCreateBibleReadingState =
      BibleReadingManagerModule.createBibleReadingState;
    const createBibleReadingStateSpy = vi
      .spyOn(BibleReadingManagerModule, "createBibleReadingState")
      .mockImplementation((...args) => {
        const state = originalCreateBibleReadingState(...args);
        decorateVersesSpy = vi.spyOn(state, "decorateVerses");
        return state;
      });

    try {
      const { tabs: manager } = createTabsManager();
      await waitForTabsToLoad(manager.tabs.value);

      expect(decorateVersesSpy).not.toBeNull();
      expect(decorateVersesSpy).toHaveBeenCalledWith("GEN", 1, [3, 5, 6], {
        className: "sb-verse-decoration-initial-verse-highlight",
        removeAfterMs: 5000,
      });
    } finally {
      createBibleReadingStateSpy.mockRestore();
    }
  });

  it("passes the first initial verse to scrollToVerse for the initial tab", async () => {
    window.history.replaceState(null, "", "?book=GEN&chapter=1&verse=7,9-10");
    setWebResponses(createExampleManagerResponseMap());

    const createBibleReadingStateSpy = vi.spyOn(
      BibleReadingManagerModule,
      "createBibleReadingState"
    );

    try {
      const { tabs: manager } = createTabsManager();
      await waitForTabsToLoad(manager.tabs.value);

      const initialOptions = createBibleReadingStateSpy.mock.calls[0]?.[3];
      expect(initialOptions?.scrollToVerse).toBe(7);
    } finally {
      createBibleReadingStateSpy.mockRestore();
    }
  });
});
