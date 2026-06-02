import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  type BibleSelectorState,
  createBibleSelectorState,
} from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { Pane } from "@packages/seed-bible/seed-bible/managers/PanesManager";
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

let webGetMock: jest.Mock;

beforeEach(() => {
  window.localStorage.clear();
  webGetMock = jest.fn();
  (globalThis as any).web = {
    get: webGetMock,
  };

  (globalThis as any).configBot = {
    tags: {},
  };

  (globalThis as any).os = {
    ...(globalThis as any).os,
    addBotListener: jest.fn(),
  };
});

afterEach(() => {
  delete (globalThis as any).web;
  delete (globalThis as any).configBot;
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
    getChapterHighlights: jest.fn().mockReturnValue(signal({ highlights: [] })),
  };
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
    openSidebar: jest.fn(),
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
  panesManager: ReturnType<typeof createPanes>
): BibleSelectorState {
  return createBibleSelectorState(
    dataManager,
    tabsManager,
    panesManager,
    createSettingsManagerMock() as any,
    createSidebarManagerMock() as any,
    createBookmarksManagerMock() as any
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

async function createManagersWithSelectedPane(): Promise<{
  readingState: BibleReadingState;
  pane: Pane;
  tabsManager: ReturnType<typeof createTabs>;
  panesManager: ReturnType<typeof createPanes>;
  dataManager: ReturnType<typeof createDataManager>;
}> {
  const dataManager = createDataManager();
  const tabsManager = createTabs(
    dataManager,
    createHighlightsManagerMock() as any,
    {} as any
  );
  const panesManager = createPanes(tabsManager, tabsManager.selectedTabId);

  const pane = panesManager.panes.value[0];
  if (!pane?.tab) {
    throw new Error("Expected an initial pane with a tab.");
  }

  const readingState = pane.tab.readingState;
  await waitForInitialLoad(readingState);
  await readingState.selectTranslation("BSB");
  await readingState.selectChapter("GEN", 1);

  return {
    readingState,
    pane,
    tabsManager,
    panesManager,
    dataManager,
  };
}

describe("createBibleSelectorState", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("setOpen() opens the selector and displays books", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );
    await selector.setOpen(true, pane);

    expect(selector.isOpen.value).toBe(true);
    expect(getDisplayedBookIds(selector)).toEqual(["GEN", "EXO", "MAT"]);
    expect(selector.expandedBookId.value).toBe("GEN");
  });

  it("setOpen() opens the selector and expands the current book", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    await pane.tab!.readingState.selectChapter("EXO", 2);

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );
    await selector.setOpen(true, pane);

    expect(selector.isOpen.value).toBe(true);
    expect(getDisplayedBookIds(selector)).toEqual(["GEN", "EXO", "MAT"]);

    expect(selector.expandedBookId.value).toBe("EXO");
    expect(selector.currentBookId.value).toBe("EXO");
    expect(selector.currentChapterNumber.value).toBe(2);
  });

  it("setSearch() filters books", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );

    await selector.setOpen(true, pane);

    expect(selector.isOpen.value).toBe(true);

    selector.setSearch("exo");

    expect(getDisplayedBookIds(selector).length).toBe(1);
    expect(getDisplayedBookIds(selector)).toEqual(["EXO"]);
  });

  it("setExpandedBook() sets expandedBookId", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );

    await selector.setOpen(true, pane);
    expect(selector.isOpen.value).toBe(true);

    selector.setExpandedBook("EXO");

    expect(selector.expandedBookId.value).toBe("EXO");
  });

  it("selectTranslation() selects the translation and updates the selector state", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, readingState, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );

    await selector.setOpen(true, pane);
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

  it("selectChapter() applies selector translation and chapter to reading state", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, readingState, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );

    await selector.setOpen(true, pane);
    await selector.selectTranslation("NIV");

    await selector.selectChapter("MAT", 1);

    expect(readingState.translationId.value).toBe("NIV");
    expect(readingState.bookId.value).toBe("MAT");
    expect(readingState.chapterNumber.value).toBe(1);
  });

  it("setOpen({forNewTab}) flips forceNewTab and selectChapter creates a new tab bound to the pane", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );

    const initialTabCount = tabsManager.tabs.value.length;
    const originalTabId = pane.tab!.id;

    await selector.setOpen(true, pane, { forNewTab: true });
    expect(selector.forceNewTab.value).toBe(true);

    await selector.selectChapter("EXO", 2);

    // A brand new tab is created — the pane's existing tab is not reused.
    expect(tabsManager.tabs.value).toHaveLength(initialTabCount + 1);
    const newTab = tabsManager.tabs.value[initialTabCount]!;
    expect(newTab.id).not.toBe(originalTabId);

    // The new tab is bound to the originally targeted pane.
    const updatedPane = panesManager.panes.value.find((p) => p.id === pane.id);
    expect(updatedPane?.tab?.id).toBe(newTab.id);

    // forceNewTab is cleared, selector closes.
    expect(selector.isOpen.value).toBe(false);
    expect(selector.forceNewTab.value).toBe(false);
  });

  it("setTargetPane() switches the pane that the next chapter selection binds to", async () => {
    setWebResponses(createExampleManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    panesManager.setLayout("split-2v");
    const otherPane =
      panesManager.panes.value.find((p) => p.id !== pane.id) ?? null;
    expect(otherPane).not.toBeNull();

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );

    await selector.setOpen(true, pane, { forNewTab: true });
    expect(selector.pane.value?.id).toBe(pane.id);

    selector.setTargetPane(otherPane!.id);
    expect(selector.pane.value?.id).toBe(otherPane!.id);

    await selector.selectChapter("GEN", 1);

    const updatedOtherPane = panesManager.panes.value.find(
      (p) => p.id === otherPane!.id
    );
    const newTabId = tabsManager.tabs.value.at(-1)!.id;
    expect(updatedOtherPane?.tab?.id).toBe(newTabId);
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
    const tabsManager = createTabs(
      dataManager,
      createHighlightsManagerMock() as any,
      {} as any
    );
    const panesManager = createPanes(tabsManager, tabsManager.selectedTabId);

    const initialPane = panesManager.panes.value[0]!;
    panesManager.openInPane(initialPane.id, { component: null });
    const tablessPane = panesManager.panes.value[0]!;

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );
    await selector.setOpen(true, tablessPane);

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
    const tabsManager = createTabs(
      dataManager,
      createHighlightsManagerMock() as any,
      {} as any
    );
    const panesManager = createPanes(tabsManager, tabsManager.selectedTabId);

    const initialPane = panesManager.panes.value[0]!;
    panesManager.openInPane(initialPane.id, { component: null });
    const tablessPane = panesManager.panes.value[0]!;

    const selector = createSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );
    await selector.setOpen(true, tablessPane);

    selector.languageQuery.value = "english";

    expect(
      selector.filteredApiTranslations.value.map((group) => group.language)
    ).toEqual(["eng", "enm"]);
  });

  describe("default translation ID (BSB) fallback behavior", () => {
    let nestedLogSpy: jest.SpyInstance;

    beforeEach(() => {
      nestedLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      nestedLogSpy.mockRestore();
    });

    function createManagersWithTablessPane() {
      const dataManager = createDataManager();
      const tabsManager = createTabs(
        dataManager,
        createHighlightsManagerMock() as any,
        {} as any
      );
      const panesManager = createPanes(tabsManager, tabsManager.selectedTabId);

      const initialPane = panesManager.panes.value[0]!;
      panesManager.openInPane(initialPane.id, { component: null });
      const tablessPane = panesManager.panes.value[0]!;

      return { dataManager, tabsManager, panesManager, tablessPane };
    }

    it("setOpen() selects DEFAULT_TRANSLATION_ID (AAB) when no pane has a tab but AAB is in available translations", async () => {
      setWebResponses(createExampleManagerResponseMap());
      const { dataManager, tabsManager, panesManager, tablessPane } =
        createManagersWithTablessPane();

      const selector = createSelectorState(
        dataManager,
        tabsManager,
        panesManager
      );
      await selector.setOpen(true, tablessPane);

      expect(selector.isOpen.value).toBe(true);
      expect(selector.selectedTranslationId.value).toBe("AAB");
    });

    it("setOpen() uses first available translation when DEFAULT_TRANSLATION_ID (BSB) is not in available translations", async () => {
      setWebResponses({
        [makeExampleUrl("/api/available_translations.json")]: createResponse({
          translations: [translations.translations[1]!],
        }),
        [makeExampleUrl("/api/NIV/books.json")]: createResponse(nivBooks),
      });
      const { dataManager, tabsManager, panesManager, tablessPane } =
        createManagersWithTablessPane();

      // Ensure there is no preselected translation in pane reading states.
      for (const pane of panesManager.panes.value) {
        if (pane.tab?.readingState.translationId) {
          pane.tab.readingState.translationId.value = null;
        }
      }

      const selector = createSelectorState(
        dataManager,
        tabsManager,
        panesManager
      );
      await selector.setOpen(true, tablessPane);

      expect(selector.isOpen.value).toBe(true);
      expect(selector.selectedTranslationId.value).toBe("NIV");
    });

    it("setOpen() sets an error when no translations are available", async () => {
      setWebResponses({
        [makeExampleUrl("/api/available_translations.json")]: createResponse({
          translations: [],
        }),
      });
      const { dataManager, tabsManager, panesManager, tablessPane } =
        createManagersWithTablessPane();

      // Ensure there is no preselected translation in pane reading states.
      for (const pane of panesManager.panes.value) {
        if (pane.tab?.readingState.translationId) {
          pane.tab.readingState.translationId.value = null;
        }
      }

      const selector = createSelectorState(
        dataManager,
        tabsManager,
        panesManager
      );

      await selector.setOpen(true, tablessPane);

      expect(selector.error.value).toBe("No available translations found.");
      expect(selector.isOpen.value).toBe(true);
    });
  });
});
