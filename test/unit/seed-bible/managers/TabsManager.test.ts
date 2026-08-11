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
  aabBooks,
  bsbBooks,
  createExampleManagerResponseMap,
  createResponse,
  makeChapter,
  makeExampleUrl,
  translations,
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
  // Reset to "/" so neither query params nor a book/chapter path written by
  // tab/URL sync effects leak into the next test's initial tab state.
  window.history.replaceState(null, "", "/");
  // Same reason for stored tabs: a case that seeds `sb-tabs-state` would
  // otherwise have the next test restore its tabs instead of starting fresh.
  window.localStorage.clear();
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

function createLoginManagerMock() {
  const userId = signal<string | null>(null);
  const profile = signal<{
    name: string;
    config?: Record<string, unknown>;
  } | null>(null);
  const updateProfile = vi.fn((newData: Record<string, unknown>) => {
    profile.value = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    } as { name: string; config?: Record<string, unknown> };
  });
  return { userId, profile, profilePromise: null, updateProfile };
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
  const login = createLoginManagerMock() as any;
  const tabs = createTabs(
    navigation,
    dataManager,
    highlightsManager,
    {} as any,
    i18nManager,
    login
  );

  return {
    navigation,
    dataManager,
    highlightsManager,
    i18nManager,
    login,
    tabs,
  };
}

function createMockSharedSession(
  id: string,
  readingState: BibleReadingState
): BibleReadingSession {
  return {
    id,
    readingState,
    document: {} as SharedDocument,
    options: signal({
      allowedNavigators: null,
      allowedDecorators: null,
      hostUserId: null,
      highlightDurationSeconds: 16,
      endedAt: null,
      shareTranslation: false,
      coHostUserIds: [],
    }),
    updateOptions: vi.fn(),
    removeSharedDecoration: vi.fn(),
    dispose: vi.fn(),
    allUsers: signal([]),
    connectedUsers: signal([]),
    localSessionId: signal(id),
    userCanDecorate: vi.fn().mockReturnValue(true),
    userCanNavigate: vi.fn().mockReturnValue(true),
    currentUser: signal(null),
    isHost: vi.fn().mockReturnValue(false),
    isSynced: signal(true),
  } as BibleReadingSession;
}

describe("createTabs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clear persisted tab state so a restore test can't leak into the next.
    window.localStorage.clear();
  });

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

    const sharedSession = createMockSharedSession(
      "session-123",
      manager.tabs.value[0]!.readingState
    );

    const nextTab = manager.addTab(sharedSession);

    expect(nextTab.readingState).toBe(sharedSession.readingState);
    expect(nextTab.sharedSession).toBe(sharedSession);
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("addTab() with a shared session writes its id to the URL as sessionId", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const sharedSession = createMockSharedSession(
      "session-456",
      manager.tabs.value[0]!.readingState
    );

    manager.addTab(sharedSession);
    await waitFor(
      () => navigation.currentUrl.value.searchParams.get("sessionId") !== null
    );

    expect(navigation.currentUrl.value.searchParams.get("sessionId")).toBe(
      "session-456"
    );
  });

  it("selectTab() away from a shared-session tab removes sessionId from the URL", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const plainTab = manager.tabs.value[0]!;
    const sharedSession = createMockSharedSession(
      "session-789",
      plainTab.readingState
    );
    const sharedTab = manager.addTab(sharedSession);
    await waitFor(
      () => navigation.currentUrl.value.searchParams.get("sessionId") !== null
    );

    manager.selectTab(plainTab.id);
    await waitFor(
      () => navigation.currentUrl.value.searchParams.get("sessionId") === null
    );

    expect(
      navigation.currentUrl.value.searchParams.get("sessionId")
    ).toBeNull();
    expect(sharedTab.sharedSession).toBe(sharedSession);
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

  it("regression #1442: removeTab() selects the tab before the removed one, not always the first tab", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const secondTab = manager.addTab();
    await waitForInitialLoad(secondTab.readingState);
    const thirdTab = manager.addTab();
    await waitForInitialLoad(thirdTab.readingState);

    manager.selectTab(thirdTab.id);
    manager.removeTab(thirdTab.id);

    // Removing the last (selected) tab of three should fall back to its
    // immediate predecessor, not unconditionally to the first tab.
    expect(manager.selectedTabId.value).toBe(secondTab.id);
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

    // Absolute path "/" (rather than a bare relative "?...") so this
    // simulates a genuine legacy query-param-only URL instead of inheriting
    // whatever path-based URL the initial mount already wrote.
    navigation.push("/?translation=NIV&book=MAT&chapter=1");

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

  it("syncs the selected tab to match a path-based URL", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);
    const secondTab = manager.addTab();
    await waitForInitialLoad(secondTab.readingState);
    manager.selectTab(secondTab.id);

    // 3-segment form: translation/book/chapter, language omitted (implies
    // the default, "en").
    navigation.push("/NIV/matthew/1");

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

  // Regression for #1443, moved here from I18nManager.test.ts: the language
  // segment is part of the same coordinated reading path as
  // translation/book/chapter now, so an external URL change with an explicit
  // `{lang}` segment must reload the actual i18next translations, not just
  // update a signal.
  it("reloads i18n when an external URL navigation specifies a different language", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation, i18nManager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);
    expect(i18nManager.language.value).toBe("en");

    try {
      // 4-segment form: explicit language segment.
      navigation.push("/de/AAB/matthew/1");

      await waitFor(() => i18nManager.language.value === "de");
      expect(i18nManager.i18n.language).toBe("de");
    } finally {
      // i18next is a shared singleton across tests in this file — reset it
      // so a later test doesn't inherit "de".
      await i18nManager.changeLanguage("en");
    }
  });

  // Note: the "re-commit the URL when the language changes outside of a
  // navigation" behavior (the effect added alongside `commitSelectedTabToUrl`
  // for exactly this case) isn't covered by its own direct test here.
  // `i18n` is a real, module-level i18next singleton shared across every test
  // in this file, and `createTabsManager()` never tears down the TabsManager
  // instances created by earlier tests — so a second test directly calling
  // `changeLanguage` fans out to every still-subscribed effect left over
  // from prior tests (each reacting to the same global language change) and
  // races to rewrite the shared jsdom URL. The test above already exercises
  // the same effect indirectly (its `changeLanguage` call is what makes that
  // test's own commit land), so the mechanism has real coverage without the
  // added flakiness of a second, order-dependent case.

  it("clears stale book/chapter from a legacy query-param URL when writing the path, even for an unrecognized book", async () => {
    window.history.replaceState(null, "", "/?book=NOTABOOK&chapter=1");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    // The language segment is always explicit now, even for the fully-default
    // state (English UI, AAB translation).
    const url = new URL(window.location.href);
    expect(url.pathname).toBe("/en/AAB/notabook/1");
    expect(url.searchParams.has("book")).toBe(false);
    expect(url.searchParams.has("chapter")).toBe(false);
  });

  it("leaves bookId as the raw unresolved segment (not a default) so the reading state can detect it wasn't found", async () => {
    window.history.replaceState(null, "", "/AAB/notabook/1");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;
    expect(readingState.bookId.value).toBe("notabook");
    expect(readingState.chapterNumber.value).toBe(1);
    expect(readingState.translationBooks.value).not.toBeNull();
    expect(readingState.error.value).toBeNull();
  });

  it.each([
    ["?book=GEN&chapter=0.5", 1],
    ["?book=GEN&chapter=2.7", 2],
    ["?book=GEN&chapter=abc", 1],
    ["?book=GEN&chapter=-4", 1],
  ])(
    "reads a non-integer chapter param safely: %s",
    async (query, expected) => {
      // `chapter=0.5` used to reach the reader as chapter 0 — the range check
      // ran before the flooring, so anything between 0 and 1 slipped past it.
      // A fractional chapter that floors to something real still resolves to
      // it rather than being thrown away.
      window.history.replaceState(null, "", query);
      const responses = createExampleManagerResponseMap();
      responses[makeExampleUrl("/api/AAB/GEN/2.json")] = createResponse(
        makeChapter(aabBooks, "GEN", 2)
      );
      setWebResponses(responses);

      const { tabs: manager } = createTabsManager();
      await waitForTabsToLoad(manager.tabs.value);

      const readingState = manager.tabs.value[0]!.readingState;
      expect(readingState.chapterNumber.value).toBe(expected);
      expect(
        webGetMock.mock.calls.map((call) => call[0] as string)
      ).not.toContain(makeExampleUrl("/api/AAB/GEN/0.json"));
    }
  );

  it("still dims a deep-linked verse when the chapter param is fractional", async () => {
    // The reader's chapter signal is normalised a second time inside
    // `createBibleReadingState`, so a bad chapter param never reaches the
    // loader. The verse decoration is not: `createInitialTabs` keys it off the
    // raw parsed value. Parsing `0.5` as chapter 0 therefore produced a
    // decoration for a chapter the reader is never on, and the dimming that is
    // supposed to point out the linked verse silently did nothing.
    window.history.replaceState(null, "", "?book=GEN&chapter=0.5&verse=3");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;
    expect(readingState.chapterNumber.value).toBe(1);
    // Decorations for a position the reader is not on are pruned, so surviving
    // this far is the assertion.
    expect(readingState.decorations.value).toHaveLength(1);
    expect(readingState.decorations.value[0]!.chapterNumber).toBe(1);
  });

  // The client-side counterpart of `legacyReadingUrlRedirect`. It has to
  // correct the same set the server does, not just typos: `getBookId` also
  // accepts aliases, other casings, and — through its `startsWith` fallback —
  // anything merely starting with a book name.
  // The fixture translation only carries GEN/EXO/MAT, so every case here
  // corrects to one of those — otherwise the reader can't follow the
  // correction and the URL is rewritten back to where it actually is.
  it.each([
    // Only resolves through the fuzzy fallback: "senesis" shares none of
    // getBookId's "gen"/"genesis" prefixes (see ReadingUrlPath.test.ts).
    ["/AAB/senesis/1", "/en/AAB/genesis/1", "GEN"],
    ["/AAB/genocide/1", "/en/AAB/genesis/1", "GEN"],
    ["/AAB/matthew-effect/1", "/en/AAB/matthew/1", "MAT"],
    ["/AAB/gen/1", "/en/AAB/genesis/1", "GEN"],
    ["/AAB/Genesis/1", "/en/AAB/genesis/1", "GEN"],
  ])(
    "self-heals %s to %s on mount",
    async (from, expectedPath, expectedBookId) => {
      window.history.replaceState(null, "", from);
      setWebResponses(createExampleManagerResponseMap());

      const { tabs: manager } = createTabsManager();
      await waitForTabsToLoad(manager.tabs.value);

      const readingState = manager.tabs.value[0]!.readingState;
      expect(readingState.bookId.value).toBe(expectedBookId);
      expect(new URL(window.location.href).pathname).toBe(expectedPath);
    }
  );

  it.each([
    ["/AAB/senesis/1", "/en/AAB/genesis/1", "GEN"],
    ["/AAB/matthew-effect/1", "/en/AAB/matthew/1", "MAT"],
    ["/AAB/Genesis/1", "/en/AAB/genesis/1", "GEN"],
  ])(
    "self-heals %s to %s on external navigation",
    async (from, expectedPath, expectedBookId) => {
      setWebResponses(createExampleManagerResponseMap());
      const { tabs: manager, navigation } = createTabsManager();
      await waitForTabsToLoad(manager.tabs.value);

      navigation.push(from);

      await waitFor(
        () => new URL(window.location.href).pathname === expectedPath
      );
      await waitFor(
        () =>
          manager.tabs.value[0]!.readingState.bookId.value === expectedBookId
      );
    }
  );

  it("settles a corrected URL after one rewrite rather than looping", async () => {
    // The correction writes `buildReadingPath` output and re-parses it on the
    // next navigation, so feeding its own result back in has to be a no-op.
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    navigation.push("/AAB/matthew-effect/1");
    await waitFor(
      () => new URL(window.location.href).pathname === "/en/AAB/matthew/1"
    );

    // Navigate to the corrected URL itself: it must be left exactly as-is.
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    navigation.push("/en/AAB/matthew/1");
    await waitFor(
      () => manager.tabs.value[0]!.readingState.bookId.value === "MAT"
    );

    expect(new URL(window.location.href).pathname).toBe("/en/AAB/matthew/1");
    // The only history write should be the `push` above — no correcting
    // `replace` on top of it.
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("writes book/chapter navigation to the URL path instead of query params", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;
    await readingState.selectChapter("EXO", 2);
    await waitFor(() => readingState.bookId.value === "EXO");

    const url = new URL(window.location.href);
    expect(url.pathname).toBe("/en/AAB/exodus/2");
    expect(url.searchParams.has("book")).toBe(false);
    expect(url.searchParams.has("chapter")).toBe(false);
  });

  it("folds a legacy translationId query param into the path instead of writing it as a query param", async () => {
    window.history.replaceState(null, "", "?translationId=NIV&book=MAT");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    // NIV isn't the default (AAB), so the language segment is shown
    // explicitly even though it's "en".
    const url = new URL(window.location.href);
    expect(url.pathname).toBe("/en/NIV/matthew/1");
    expect(url.searchParams.has("translationId")).toBe(false);
    expect(url.searchParams.has("translation")).toBe(false);
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

  it("reads its startup params from the URL the page opened with, not a later one", async () => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/?book=EXO&chapter=2&verse=5");
    setWebResponses(createExampleManagerResponseMap());

    // The navigation manager freezes the arrival URL; something then moves the
    // live one before the tabs are built. The reader's own position-to-URL echo
    // does exactly this on a real cold start, which is why the startup reads have
    // to come from the frozen snapshot.
    const navigation = createNavigationManager();
    window.history.replaceState(null, "", "/");
    expect(navigation.currentUrl.value.search).toBe("");

    const i18nManager = createI18nManager(navigation, ["en"]);
    const manager = createTabs(
      navigation,
      createDataManager(),
      createHighlightsManagerMock() as any,
      {} as any,
      i18nManager,
      createLoginManagerMock() as any
    );
    await waitForTabsToLoad(manager.tabs.value);

    const firstTab = manager.tabs.value[0]!;
    expect(firstTab.readingState.bookId.value).toBe("EXO");
    expect(firstTab.readingState.chapterNumber.value).toBe(2);
    // `?verse=` is read from the same snapshot, so the scroll target and the
    // transient highlight survive too.
    expect(firstTab.readingState.scrollToVerse.value).toBe(5);
    expect(
      firstTab.readingState.decorations.value.some((decoration) =>
        decoration.verses.includes(5)
      )
    ).toBe(true);
  });

  it("restores stored tabs when the URL has no reading params", async () => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    window.localStorage.setItem(
      "sb-tabs-state",
      JSON.stringify({
        version: 1,
        tabs: [
          {
            id: "tab-1",
            translationId: "AAB",
            bookId: "EXO",
            chapterNumber: 2,
          },
        ],
        selectedTabId: "tab-1",
        layout: "single",
        slotTabIds: ["tab-1"],
        selectedSlotIndex: 0,
      })
    );
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    expect(manager.tabs.value).toHaveLength(1);
    const readingState = manager.tabs.value[0]!.readingState;
    expect(readingState.translationId.value).toBe("AAB");
    expect(readingState.bookId.value).toBe("EXO");
    expect(readingState.chapterNumber.value).toBe(2);
  });

  it("reconciles a deep link against stored tabs, selecting the matching tab", async () => {
    window.localStorage.clear();
    window.history.replaceState(
      null,
      "",
      "/?translation=NIV&book=MAT&chapter=1"
    );
    window.localStorage.setItem(
      "sb-tabs-state",
      JSON.stringify({
        version: 1,
        tabs: [
          {
            id: "tab-1",
            translationId: "AAB",
            bookId: "GEN",
            chapterNumber: 1,
          },
          {
            id: "tab-2",
            translationId: "NIV",
            bookId: "MAT",
            chapterNumber: 1,
          },
        ],
        selectedTabId: "tab-1",
        layout: "split-2v",
        slotTabIds: ["tab-1", "tab-2"],
        selectedSlotIndex: 0,
      })
    );
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    // The query translation (NIV) matches the second stored tab, so it is
    // updated to the query position and selected; the first tab is untouched.
    expect(manager.tabs.value).toHaveLength(2);
    expect(manager.selectedTabId.value).toBe("tab-2");
    const selected = manager.tabs.value.find(
      (tab) => tab.id === "tab-2"
    )!.readingState;
    expect(selected.translationId.value).toBe("NIV");
    expect(selected.bookId.value).toBe("MAT");
    expect(selected.chapterNumber.value).toBe(1);
  });

  it("applies the saved profile translation to the selected tab once the profile loads, when the URL has no explicit translation", async () => {
    window.history.replaceState(null, "", "?book=MAT&chapter=1");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager, login } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const firstTab = manager.tabs.value[0]!;
    expect(firstTab.readingState.translationId.value).toBe("AAB");

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: { translationId: "NIV" } };

    await waitFor(() => firstTab.readingState.translationId.value === "NIV");
    await waitForInitialLoad(firstTab.readingState);

    expect(firstTab.readingState.translationId.value).toBe("NIV");
    // Only the translation should change; the reading position is preserved.
    expect(firstTab.readingState.bookId.value).toBe("MAT");
    expect(firstTab.readingState.chapterNumber.value).toBe(1);
  });

  it("commits the restored translation to the URL immediately, so an unrelated query-param write elsewhere doesn't revert it", async () => {
    // Regression test: an extension mounting its own `?today=open`-style URL
    // param (via `syncSignalsToUrl`) right after the restore used to look
    // like an external navigation to `syncSelectedTabFromUrl`, which read
    // the (still translation-less) URL and reverted straight back to AAB.
    window.history.replaceState(null, "", "?book=MAT&chapter=1");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager, login, navigation } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const firstTab = manager.tabs.value[0]!;
    expect(firstTab.readingState.translationId.value).toBe("AAB");

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: { translationId: "NIV" } };

    await waitFor(() => firstTab.readingState.translationId.value === "NIV");
    await waitForInitialLoad(firstTab.readingState);

    // The restore should have committed the NIV translation (a `replace`, no
    // history push) to the URL right away. NIV isn't the default translation,
    // so the language segment is shown explicitly even though it's "en".
    expect(new URL(window.location.href).pathname).toBe("/en/NIV/matthew/1");

    // Simulate an extension binding its own param to the URL after the
    // restore, unrelated to translation/book/chapter.
    navigation.updateQueryParams({ today: "open" });
    await waitForInitialLoad(firstTab.readingState);

    expect(firstTab.readingState.translationId.value).toBe("NIV");
    expect(new URL(window.location.href).searchParams.get("today")).toBe(
      "open"
    );
  });

  it("does not let a slow initial tab load clobber a translation restored while it was still in flight", async () => {
    // Regression test for the real root cause behind the "flickers to the
    // saved translation, then reverts to the default" bug: a freshly created
    // tab's own initial load (`loadInitialData`) is already in flight when
    // the profile loads, and unconditionally writes its own (stale, default)
    // translation/book/chapter when it finishes — with no awareness that a
    // restore already landed in the meantime. This reproduces that ordering
    // by holding the initial chapter fetch open until after the restore has
    // had a chance to (wrongly) race ahead.
    const responses = createExampleManagerResponseMap();
    const aabChapterUrl = makeExampleUrl("/api/AAB/GEN/1.json");
    let resolveAabChapter: () => void = () => undefined;
    const aabChapterGate = new Promise<void>((resolve) => {
      resolveAabChapter = resolve;
    });

    webGetMock.mockImplementation(async (url: string) => {
      if (url === aabChapterUrl) {
        await aabChapterGate;
      }
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      return response;
    });

    const { tabs: manager, login } = createTabsManager();
    const firstTab = manager.tabs.value[0]!;

    // Still stuck fetching the default translation's first chapter.
    expect(firstTab.readingState.loading.value).toBe(true);

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: { translationId: "NIV" } };

    // The restore should be waiting for the tab to go idle rather than racing
    // ahead of the still-in-flight initial load.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(firstTab.readingState.translationId.value).toBe("AAB");

    // Let the slow initial load finish.
    resolveAabChapter();
    await waitForInitialLoad(firstTab.readingState);

    // The restore runs after, so it's the last write and isn't clobbered by
    // the (now-finished) initial load.
    await waitFor(() => firstTab.readingState.translationId.value === "NIV");
    await waitForInitialLoad(firstTab.readingState);
    expect(firstTab.readingState.translationId.value).toBe("NIV");
  });

  it("does not let the restore overwrite a translation the user explicitly picks while it is still in flight", async () => {
    // Regression test: the restore captures the saved translation id and does
    // two awaits (waitForIdle, then fetching that translation's books) before
    // actually switching. If the user explicitly picks a different
    // translation while those awaits are pending, that deliberate choice must
    // win — the restore should notice the reading state moved on and bail
    // instead of clobbering it back to the (now stale) saved translation.
    const responses: WebResponseMap = {
      ...createExampleManagerResponseMap(),
      [makeExampleUrl("/api/available_translations.json")]: createResponse({
        translations: [...translations.translations, bsbBooks.translation],
      }),
      [makeExampleUrl("/api/BSB/books.json")]: createResponse(bsbBooks),
      [makeExampleUrl("/api/BSB/GEN/1.json")]: createResponse(
        makeChapter(bsbBooks, "GEN", 1)
      ),
    };

    const nivBooksUrl = makeExampleUrl("/api/NIV/books.json");
    let resolveNivBooks: () => void = () => undefined;
    const nivBooksGate = new Promise<void>((resolve) => {
      resolveNivBooks = resolve;
    });

    webGetMock.mockImplementation(async (url: string) => {
      if (url === nivBooksUrl) {
        await nivBooksGate;
      }
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      return response;
    });

    window.history.replaceState(null, "", "?book=MAT&chapter=1");
    const { tabs: manager, login } = createTabsManager();
    const firstTab = manager.tabs.value[0]!;
    await waitForInitialLoad(firstTab.readingState);
    expect(firstTab.readingState.translationId.value).toBe("AAB");

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: { translationId: "NIV" } };

    // The restore is now waiting on the (gated) NIV books fetch. Simulate the
    // user explicitly picking a different translation in the meantime.
    await firstTab.readingState.selectTranslation("BSB");
    expect(firstTab.readingState.translationId.value).toBe("BSB");

    // Let the restore's books fetch finish.
    resolveNivBooks();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await waitForInitialLoad(firstTab.readingState);

    // The user's explicit pick must stick — the restore should have noticed
    // the translation changed out from under it and bailed, not reverted to
    // the (stale) saved translation.
    expect(firstTab.readingState.translationId.value).toBe("BSB");
  });

  it("does not act on a restore for a tab that was closed while it was still in flight", async () => {
    // Regression test: the restore fetches the saved translation's books
    // asynchronously; if the tab is closed while that's in flight, the
    // restore should notice and bail rather than run selectTranslationAndChapter
    // against a disposed reading state nobody will ever see.
    const responses = createExampleManagerResponseMap();
    const nivBooksUrl = makeExampleUrl("/api/NIV/books.json");
    let resolveNivBooks: () => void = () => undefined;
    const nivBooksGate = new Promise<void>((resolve) => {
      resolveNivBooks = resolve;
    });

    webGetMock.mockImplementation(async (url: string) => {
      if (url === nivBooksUrl) {
        await nivBooksGate;
      }
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      return response;
    });

    window.history.replaceState(null, "", "?book=MAT&chapter=1");
    const { tabs: manager, login } = createTabsManager();
    const firstTab = manager.tabs.value[0]!;
    await waitForInitialLoad(firstTab.readingState);

    // A second tab so removing the first one doesn't leave the manager empty.
    const secondTab = manager.addTab();
    await waitForInitialLoad(secondTab.readingState);
    manager.selectTab(firstTab.id);

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: { translationId: "NIV" } };

    // The restore is now waiting on the (gated) NIV books fetch. Close the
    // tab it's targeting in the meantime.
    manager.removeTab(firstTab.id);

    resolveNivBooks();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Nothing to assert on the closed tab's reading state beyond "it didn't
    // throw" — the point is the restore quietly no-ops instead of acting on
    // a disposed reading state.
    expect(firstTab.readingState.translationId.value).toBe("AAB");
  });

  it("keeps an explicit URL translation over a saved profile translation", async () => {
    window.history.replaceState(
      null,
      "",
      "?translation=NIV&book=MAT&chapter=1"
    );
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager, login } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const firstTab = manager.tabs.value[0]!;
    expect(firstTab.readingState.translationId.value).toBe("NIV");

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: { translationId: "AAB" } };

    // The profile-apply effect runs synchronously off the profile signal; a
    // differing saved value must not override an explicit URL translation.
    expect(firstTab.readingState.translationId.value).toBe("NIV");
  });

  it("falls back to the saved translation's first book when it doesn't contain the current book", async () => {
    // No `?book=` param, so the initial tab is on the default book (GEN),
    // which AAB has but NIV (mocked with a single book, MAT) does not.
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager, login } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const firstTab = manager.tabs.value[0]!;
    expect(firstTab.readingState.translationId.value).toBe("AAB");
    expect(firstTab.readingState.bookId.value).toBe("GEN");

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: { translationId: "NIV" } };

    await waitFor(() => firstTab.readingState.translationId.value === "NIV");
    await waitForInitialLoad(firstTab.readingState);

    // Falls back to NIV's first available book/chapter instead of failing.
    expect(firstTab.readingState.bookId.value).toBe("MAT");
    expect(firstTab.readingState.chapterNumber.value).toBe(1);
    expect(firstTab.readingState.error.value).toBeNull();
  });

  it("does not persist a translation change by itself — only the Bible selector's explicit pick does", async () => {
    // TabsManager only reads the saved translation (to restore it on login);
    // persisting it is BibleSelectorManager's job, wired to the explicit
    // pick in the selector UI. A translation change driven directly through
    // the reading state (as any of the many non-selector call sites do)
    // should never write to the profile on its own.
    window.history.replaceState(null, "", "?book=MAT&chapter=1");
    setWebResponses(createExampleManagerResponseMap());

    const { tabs: manager, login } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: {} };

    const firstTab = manager.tabs.value[0]!;
    await firstTab.readingState.selectTranslation("NIV");

    expect(login.updateProfile).not.toHaveBeenCalled();
    expect(login.profile.value).toEqual({ name: "", config: {} });
  });

  it("does not persist a translation change driven by URL sync (e.g. browser back/forward or a deep link)", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation, login } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    login.userId.value = "user-1";
    login.profile.value = { name: "", config: {} };

    navigation.push("/en/NIV/matthew/1");

    const selectedTab = manager.tabs.value.find(
      (tab) => tab.id === manager.selectedTabId.value
    )!;
    await waitFor(() => selectedTab.readingState.translationId.value === "NIV");
    await waitForInitialLoad(selectedTab.readingState);

    expect(login.updateProfile).not.toHaveBeenCalled();
    expect(login.profile.value).toEqual({ name: "", config: {} });
  });

  it("encodes a full custom-endpoint translation URL as a single path segment", async () => {
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

    // Not the fully-default translation, so the language segment is shown
    // explicitly even though it's "en".
    const expectedPathname = `/en/${encodeURIComponent(customTranslationUrl)}/matthew/1`;
    await waitFor(
      () => new URL(window.location.href).pathname === expectedPathname
    );
    const url = new URL(window.location.href);
    expect(url.searchParams.has("translationId")).toBe(false);
    expect(url.searchParams.has("translation")).toBe(false);
    expect(buildTranslationIdSpy).toHaveBeenCalledWith("NIV");
  });

  it("updates the verse URL param from selected verses in the current chapter", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;
    const currentBookId = readingState.bookId.value;
    const currentChapter = readingState.chapterNumber.value;

    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

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

    const url = new URL(window.location.href);
    expect(url.searchParams.get("verse")).toBe("1-3");

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
  });

  it("clears the verse URL param when selected verses become empty", async () => {
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

    let url = new URL(window.location.href);
    expect(url.searchParams.get("verse")).toBe("4");

    readingState.selectedVerses.value = [];

    url = new URL(window.location.href);
    expect(url.searchParams.has("verse")).toBe(false);
  });

  it("uses selected tab verses when syncing the verse URL param", async () => {
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
    let url = new URL(window.location.href);
    expect(url.searchParams.get("verse")).toBe("2");

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

    url = new URL(window.location.href);
    expect(url.searchParams.get("verse")).toBe("6");
  });

  it("performs exactly one pushState for a single translation navigation", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;

    // Spy only after the initial mount commit (a replace) has happened.
    const pushSpy = vi.spyOn(window.history, "pushState");

    await readingState.selectTranslation("NIV");
    await waitFor(() => readingState.translationId.value === "NIV");
    await waitForInitialLoad(readingState);

    // Selecting a translation loads its first book/chapter asynchronously in
    // several steps; prescriptive updates collapse that into a single entry.
    expect(readingState.bookId.value).toBe("MAT");
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("a fast skim costs one history entry, not one per chapter", async () => {
    // The Back button is the whole point of coalescing: after skimming, one
    // press has to return the reader to where the skim started rather than
    // walking them back through every chapter they flicked past.
    const responses = createExampleManagerResponseMap();
    for (const chapter of [2, 3, 4, 5]) {
      responses[makeExampleUrl(`/api/AAB/GEN/${chapter}.json`)] =
        createResponse(makeChapter(aabBooks, "GEN", chapter));
    }
    setWebResponses(responses);
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;

    // Spy only after the initial mount commit (a replace) has happened.
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    readingState.loadNextChapter();
    readingState.loadNextChapter();
    readingState.loadNextChapter();
    readingState.loadNextChapter();
    await waitFor(() => readingState.chapterNumber.value === 5);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledTimes(3);

    const url = new URL(window.location.href);
    expect(url.pathname).toBe("/en/AAB/genesis/5");
    expect(url.searchParams.has("chapter")).toBe(false);
  });

  it("switching tabs replaces the URL without pushing a new history entry", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const secondTab = manager.addTab();
    await waitForInitialLoad(secondTab.readingState);
    // Move the second tab to a different position so switching back changes the
    // URL (otherwise the commit would be a no-op).
    await secondTab.readingState.selectChapter("EXO", 2);
    await waitFor(() => secondTab.readingState.bookId.value === "EXO");

    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    manager.selectTab(manager.tabs.value[0]!.id);
    await waitFor(
      () => new URL(window.location.href).pathname === "/en/AAB/genesis/1"
    );

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
  });

  it("syncing reading state from the URL does not push a new history entry", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { tabs: manager, navigation } = createTabsManager();
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = manager.tabs.value[0]!.readingState;

    const pushSpy = vi.spyOn(window.history, "pushState");

    // Simulate a back/forward / deep-link URL change; the reader should update
    // the reading state without writing the URL back. Absolute path "/" (not
    // a bare relative "?...") so this is a genuine legacy query-param-only
    // URL rather than inheriting the path the initial mount already wrote.
    navigation.replace("/?book=EXO&chapter=2");
    await waitFor(() => readingState.bookId.value === "EXO");
    await waitForInitialLoad(readingState);

    expect(readingState.chapterNumber.value).toBe(2);
    expect(pushSpy).not.toHaveBeenCalled();
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
        className: "sb-verse-decoration-diminish",
        containerClassName: "sb-chapter-decoration-diminish",
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
