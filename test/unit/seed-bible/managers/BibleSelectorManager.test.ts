import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  type BibleSelectorState,
  createBibleSelectorState,
} from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import { createTabsLayout } from "@packages/seed-bible/seed-bible/managers/TabsLayoutManager";
import type { TabSlot } from "@packages/seed-bible/seed-bible/managers/TabsLayoutManager";
import { createTabs } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import {
  EXAMPLE_API_ENDPOINT,
  type WebResponseMap,
  createExampleManagerResponseMap,
} from "./testUtils/mockBibleApiData";
import { signal } from "@preact/signals";
import {
  makeExampleUrl,
  createResponse,
  translations,
  bsbBooks,
  makeChapter,
  nivBooks,
} from "./testUtils/mockBibleApiData";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import type { Mock } from "vitest";
import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n";

let webGetMock: Mock;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  window.localStorage.clear();
  webGetMock = vi.fn();
  globalThis.fetch = webGetMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  // Clear URL params written by syncSignalsToUrl (e.g. `?selector=open`) so they
  // don't leak into the next test's selector instance.
  window.history.replaceState(null, "", window.location.pathname);
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

function createSettingsManagerMock() {
  return {
    settings: signal({
      bookOrientation: "traditional",
    }),
  };
}

function createSidebarManagerMock() {
  return {
    isMobileOpen: signal(false),
    openSidebar: vi.fn(),
  };
}

function createBookmarksManagerMock() {
  return {
    bookmarks: signal([]),
  };
}

function createSelectorState(
  dataManager: ReturnType<typeof createDataManager>,
  tabsManager: ReturnType<typeof createTabs>,
  tabsLayoutManager: ReturnType<typeof createTabsLayout>,
  login: ReturnType<typeof createLoginManagerMock> = createLoginManagerMock()
): BibleSelectorState {
  return createBibleSelectorState(
    dataManager,
    tabsManager,
    tabsLayoutManager,
    createSettingsManagerMock() as any,
    createSidebarManagerMock() as any,
    createBookmarksManagerMock() as any,
    createNavigationManager(),
    login as any
  );
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

function getDisplayedBookIds(selector: BibleSelectorState): string[] {
  const oldTestament = selector.groupedBooks.value.oldTestament.map(
    (book) => book.id
  );
  const newTestament = selector.groupedBooks.value.newTestament.map(
    (book) => book.id
  );
  return [...oldTestament, ...newTestament];
}

function makeTranslationWithLanguage(props: {
  id: string;
  shortName: string;
  language: string;
  languageEnglishName: string;
}): Translation {
  const { id, shortName, language, languageEnglishName } = props;
  return {
    id,
    name: `${id} Translation`,
    englishName: `${id} Translation`,
    languageEnglishName,
    website: "https://example.com",
    licenseUrl: "https://example.com/license",
    shortName,
    language,
    textDirection: "ltr",
    availableFormats: ["json"],
    listOfBooksApiLink: `/api/${id}/books.json`,
    numberOfBooks: 66,
    totalNumberOfChapters: 1189,
    totalNumberOfVerses: 31102,
  };
}

async function createManagersWithSelectedSlot(): Promise<{
  readingState: BibleReadingState;
  slot: TabSlot;
  tabsManager: ReturnType<typeof createTabs>;
  tabsLayoutManager: ReturnType<typeof createTabsLayout>;
  dataManager: ReturnType<typeof createDataManager>;
}> {
  const dataManager = createDataManager();
  const navigation = createNavigationManager();
  const tabsManager = createTabs(
    navigation,
    dataManager,
    createHighlightsManagerMock() as any,
    {} as any,
    createI18nManager(navigation, ["en"]),
    createLoginManagerMock() as any
  );
  const tabsLayoutManager = createTabsLayout(tabsManager, signal(true));

  const slot = tabsLayoutManager.slots.value[0];
  if (!slot?.tab) {
    throw new Error("Expected an initial slot with a tab.");
  }

  const readingState = slot.tab.readingState;
  await waitForInitialLoad(readingState);
  await readingState.selectTranslation("BSB");
  await readingState.selectChapter("GEN", 1);

  return {
    readingState,
    slot,
    tabsManager,
    tabsLayoutManager,
    dataManager,
  };
}

describe("createBibleSelectorState", () => {
  let logSpy: Mock;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("setOpen() opens the selector and displays books", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );
    await selector.setOpen(true, slot);

    expect(selector.isOpen.value).toBe(true);
    expect(getDisplayedBookIds(selector)).toEqual(["GEN", "EXO", "MAT"]);
    expect(selector.expandedBookId.value).toBe("GEN");
  });

  it("syncs the open state to the `selector` URL query param", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );

    await selector.setOpen(true, slot);
    expect(new URLSearchParams(window.location.search).get("selector")).toBe(
      "open"
    );

    await selector.setOpen(false);
    expect(new URLSearchParams(window.location.search).get("selector")).toBe(
      null
    );
  });

  it("setOpen() opens the selector and expands the current book", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    await slot.tab!.readingState.selectChapter("EXO", 2);

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );
    await selector.setOpen(true, slot);

    expect(selector.isOpen.value).toBe(true);
    expect(getDisplayedBookIds(selector)).toEqual(["GEN", "EXO", "MAT"]);

    expect(selector.expandedBookId.value).toBe("EXO");
    expect(selector.currentBookId.value).toBe("EXO");
    expect(selector.currentChapterNumber.value).toBe(2);
  });

  it("setSearch() filters books", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );

    await selector.setOpen(true, slot);

    expect(selector.isOpen.value).toBe(true);

    selector.setSearch("exo");

    expect(getDisplayedBookIds(selector).length).toBe(1);
    expect(getDisplayedBookIds(selector)).toEqual(["EXO"]);
  });

  it("setExpandedBook() sets expandedBookId", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );

    await selector.setOpen(true, slot);
    expect(selector.isOpen.value).toBe(true);

    selector.setExpandedBook("EXO");

    expect(selector.expandedBookId.value).toBe("EXO");
  });

  it("selectTranslation() selects the translation and updates the selector state", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, readingState, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );

    await selector.setOpen(true, slot);
    expect(selector.isOpen.value).toBe(true);

    await selector.selectTranslation("NIV");

    expect(selector.selectedTranslationId.value).toBe("NIV");

    // Should expand the first book of the selected translation
    expect(selector.expandedBookId.value).toBe("MAT");

    expect(selector.currentTranslationId.value).toBe("NIV");
    expect(selector.currentBookId.value).toBe("MAT");
    expect(selector.currentChapterNumber.value).toBe(1);
    expect(readingState.translationId.value).toBe("NIV");
    expect(readingState.bookId.value).toBe("MAT");
    expect(readingState.chapterNumber.value).toBe(1);
  });

  it("pickTranslation() behaves like selectTranslation() and persists the choice to the user's profile", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, readingState, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();
    const login = createLoginManagerMock();
    login.userId.value = "user-1";
    login.profile.value = { name: "", config: {} };

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager,
      login
    );

    await selector.setOpen(true, slot);
    await selector.pickTranslation("NIV");

    expect(selector.selectedTranslationId.value).toBe("NIV");
    expect(readingState.translationId.value).toBe("NIV");
    expect(login.updateProfile).toHaveBeenCalledWith({
      config: { translationId: "NIV" },
    });
    expect(login.profile.value).toEqual({
      name: "",
      config: { translationId: "NIV" },
    });
  });

  it("selectTranslation() does not persist to the profile (only an explicit selector pick via pickTranslation() does)", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();
    const login = createLoginManagerMock();
    login.userId.value = "user-1";
    login.profile.value = { name: "", config: {} };

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager,
      login
    );

    await selector.setOpen(true, slot);
    await selector.selectTranslation("NIV");

    expect(selector.selectedTranslationId.value).toBe("NIV");
    expect(login.updateProfile).not.toHaveBeenCalled();
    expect(login.profile.value).toEqual({ name: "", config: {} });
  });

  it("selectChapter() applies selector translation and chapter to reading state", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, readingState, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );

    await selector.setOpen(true, slot);
    await selector.selectTranslation("NIV");

    await selector.selectChapter("MAT", 1);

    expect(readingState.translationId.value).toBe("NIV");
    expect(readingState.bookId.value).toBe("MAT");
    expect(readingState.chapterNumber.value).toBe(1);
  });

  it("setOpen({forNewTab}) flips forceNewTab and selectChapter creates a new tab bound to the slot", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );

    const initialTabCount = tabsManager.tabs.value.length;
    const originalTabId = slot.tab!.id;

    await selector.setOpen(true, slot, { forNewTab: true });
    expect(selector.forceNewTab.value).toBe(true);

    await selector.selectChapter("EXO", 2);

    // A brand new tab is created — the slot's existing tab is not reused.
    expect(tabsManager.tabs.value).toHaveLength(initialTabCount + 1);
    const newTab = tabsManager.tabs.value[initialTabCount]!;
    expect(newTab.id).not.toBe(originalTabId);

    // The new tab is bound to the originally targeted slot.
    const updatedSlot = tabsLayoutManager.slots.value.find(
      (s) => s.id === slot.id
    );
    expect(updatedSlot?.tab?.id).toBe(newTab.id);

    // forceNewTab is cleared, selector closes.
    expect(selector.isOpen.value).toBe(false);
    expect(selector.forceNewTab.value).toBe(false);
  });

  it("setTargetSlot() switches the slot that the next chapter selection binds to", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, slot, tabsManager, tabsLayoutManager } =
      await createManagersWithSelectedSlot();

    tabsLayoutManager.setLayout("split-2v");
    const otherSlot =
      tabsLayoutManager.slots.value.find((s) => s.id !== slot.id) ?? null;
    expect(otherSlot).not.toBeNull();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );

    await selector.setOpen(true, slot, { forNewTab: true });
    expect(selector.slot.value?.id).toBe(slot.id);

    selector.setTargetSlot(otherSlot!.id);
    expect(selector.slot.value?.id).toBe(otherSlot!.id);

    await selector.selectChapter("GEN", 1);

    const updatedOtherSlot = tabsLayoutManager.slots.value.find(
      (s) => s.id === otherSlot!.id
    );
    const newTabId = tabsManager.tabs.value.at(-1)!.id;
    expect(updatedOtherSlot?.tab?.id).toBe(newTabId);
  });

  it("groups api translations by language code instead of language english name", async () => {
    const aab = makeTranslationWithLanguage({
      id: "AAB",
      shortName: "AAB",
      language: "eng",
      languageEnglishName: "English",
    });
    const mid = makeTranslationWithLanguage({
      id: "MID",
      shortName: "MID",
      language: "enm",
      languageEnglishName: "English",
    });
    const rvr = makeTranslationWithLanguage({
      id: "RVR",
      shortName: "RVR",
      language: "spa",
      languageEnglishName: "Spanish",
    });

    setWebResponses({
      [makeExampleUrl("/api/available_translations.json")]: createResponse({
        translations: [aab, mid, rvr],
      }),
      [makeExampleUrl("/api/AAB/books.json")]: createResponse({
        ...nivBooks,
        translation: aab,
      }),
      [makeExampleUrl("/api/MID/books.json")]: createResponse({
        ...nivBooks,
        translation: mid,
      }),
      [makeExampleUrl("/api/RVR/books.json")]: createResponse({
        ...nivBooks,
        translation: rvr,
      }),
      [makeExampleUrl("/api/AAB/GEN/1.json")]: createResponse(
        makeChapter(
          {
            ...bsbBooks,
            translation: aab,
          },
          "GEN",
          1
        )
      ),
    });

    const dataManager = createDataManager();
    const navigation = createNavigationManager();
    const tabsManager = createTabs(
      navigation,
      dataManager,
      createHighlightsManagerMock() as any,
      {} as any,
      createI18nManager(navigation, ["en"]),
      createLoginManagerMock() as any
    );
    const tabsLayoutManager = createTabsLayout(tabsManager, signal(true));

    const initialSlot = tabsLayoutManager.slots.value[0]!;
    tabsLayoutManager.slots.value = tabsLayoutManager.slots.value.map((slot) =>
      slot.id === initialSlot.id ? { ...slot, tab: null } : slot
    );
    const tablessSlot = tabsLayoutManager.slots.value[0]!;

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );
    await selector.setOpen(true, tablessSlot);

    expect(
      selector.apiTranslations.value.map((group) => group.language)
    ).toEqual(["eng", "enm", "spa"]);
    expect(
      selector.apiTranslations.value.some(
        (group) => group.language === "english"
      )
    ).toBe(false);

    expect(
      selector.filteredApiTranslations.value.map((group) => group.language)
    ).toEqual(["eng", "enm", "spa"]);

    expect(selector.filteredApiTranslations.value[0]?.languageEnglishName).toBe(
      "English"
    );
    expect(
      selector.filteredApiTranslations.value[0]?.translations
    ).toHaveLength(1);
  });

  it("filters code-grouped translations when searching by language english name", async () => {
    const aab = makeTranslationWithLanguage({
      id: "AAB",
      shortName: "AAB",
      language: "eng",
      languageEnglishName: "English",
    });
    const mid = makeTranslationWithLanguage({
      id: "MID",
      shortName: "MID",
      language: "enm",
      languageEnglishName: "English",
    });
    const rvr = makeTranslationWithLanguage({
      id: "RVR",
      shortName: "RVR",
      language: "spa",
      languageEnglishName: "Spanish",
    });

    setWebResponses({
      [makeExampleUrl("/api/available_translations.json")]: createResponse({
        translations: [aab, mid, rvr],
      }),
      [makeExampleUrl("/api/AAB/books.json")]: createResponse({
        ...nivBooks,
        translation: aab,
      }),
      [makeExampleUrl("/api/MID/books.json")]: createResponse({
        ...nivBooks,
        translation: mid,
      }),
      [makeExampleUrl("/api/RVR/books.json")]: createResponse({
        ...nivBooks,
        translation: rvr,
      }),
      [makeExampleUrl("/api/AAB/GEN/1.json")]: createResponse(
        makeChapter(
          {
            ...bsbBooks,
            translation: aab,
          },
          "GEN",
          1
        )
      ),
    });

    const dataManager = createDataManager();
    const navigation = createNavigationManager();
    const tabsManager = createTabs(
      navigation,
      dataManager,
      createHighlightsManagerMock() as any,
      {} as any,
      createI18nManager(navigation, ["en"]),
      createLoginManagerMock() as any
    );
    const tabsLayoutManager = createTabsLayout(tabsManager, signal(true));

    const initialSlot = tabsLayoutManager.slots.value[0]!;
    tabsLayoutManager.slots.value = tabsLayoutManager.slots.value.map((slot) =>
      slot.id === initialSlot.id ? { ...slot, tab: null } : slot
    );
    const tablessSlot = tabsLayoutManager.slots.value[0]!;

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      tabsLayoutManager
    );
    await selector.setOpen(true, tablessSlot);

    selector.languageQuery.value = "english";

    expect(
      selector.filteredApiTranslations.value.map((group) => group.language)
    ).toEqual(["eng", "enm"]);
  });

  describe("default translation ID (BSB) fallback behavior", () => {
    let nestedLogSpy: Mock;

    beforeEach(() => {
      nestedLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      nestedLogSpy.mockRestore();
    });

    function createManagersWithTablessSlot() {
      const dataManager = createDataManager();
      const navigation = createNavigationManager();
      const tabsManager = createTabs(
        navigation,
        dataManager,
        createHighlightsManagerMock() as any,
        {} as any,
        createI18nManager(navigation, ["en"]),
        createLoginManagerMock() as any
      );
      const tabsLayoutManager = createTabsLayout(tabsManager, signal(true));

      const initialSlot = tabsLayoutManager.slots.value[0]!;
      tabsLayoutManager.slots.value = tabsLayoutManager.slots.value.map(
        (slot) => (slot.id === initialSlot.id ? { ...slot, tab: null } : slot)
      );
      const tablessSlot = tabsLayoutManager.slots.value[0]!;

      return { dataManager, tabsManager, tabsLayoutManager, tablessSlot };
    }

    it("setOpen() selects DEFAULT_TRANSLATION_ID (AAB) when no slot has a tab but AAB is in available translations", async () => {
      setWebResponses(createExampleManagerResponseMap());
      const { dataManager, tabsManager, tabsLayoutManager, tablessSlot } =
        createManagersWithTablessSlot();

      const selector = createSelectorState(
        dataManager,
        tabsManager,
        tabsLayoutManager
      );
      await selector.setOpen(true, tablessSlot);

      expect(selector.isOpen.value).toBe(true);
      expect(selector.selectedTranslationId.value).toBe("AAB");
    });

    it("setOpen() uses first available translation when DEFAULT_TRANSLATION_ID (AAB) is not in available translations", async () => {
      setWebResponses({
        [makeExampleUrl("/api/available_translations.json")]: createResponse({
          translations: [translations.translations[1]!],
        }),
        [makeExampleUrl("/api/NIV/books.json")]: createResponse(nivBooks),
      });
      const { dataManager, tabsManager, tabsLayoutManager, tablessSlot } =
        createManagersWithTablessSlot();

      for (const slot of tabsLayoutManager.slots.value) {
        if (slot.tab?.readingState.translationId) {
          expect(slot.tab.readingState.translationId.value).not.toBe("NIV");
        }
      }

      const selector = createSelectorState(
        dataManager,
        tabsManager,
        tabsLayoutManager
      );
      await selector.setOpen(true, tablessSlot);

      expect(selector.isOpen.value).toBe(true);
      expect(selector.selectedTranslationId.value).toBe("NIV");
    });

    it("setOpen() sets an error when no translations are available", async () => {
      setWebResponses({
        [makeExampleUrl("/api/available_translations.json")]: createResponse({
          translations: [],
        }),
      });
      const { dataManager, tabsManager, tabsLayoutManager, tablessSlot } =
        createManagersWithTablessSlot();

      for (const slot of tabsLayoutManager.slots.value) {
        if (slot.tab?.readingState.translationId) {
          expect(slot.tab.readingState.translationId.value).not.toBe("NIV");
        }
      }

      const selector = createSelectorState(
        dataManager,
        tabsManager,
        tabsLayoutManager
      );

      await selector.setOpen(true, tablessSlot);

      expect(selector.error.value).toBe("No available translations found.");
      expect(selector.isOpen.value).toBe(true);
    });
  });
});
