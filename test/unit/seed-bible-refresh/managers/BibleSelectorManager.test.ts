/** @jest-environment ./test/env/CasualOSEnvironment.ts */

import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  type BibleSelectorState,
  createBibleSelectorState,
} from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { Pane } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { createTabs } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import {
  API_ENDPOINT,
  type WebResponseMap,
  createDefaultManagerResponseMap,
} from "./testUtils/mockBibleApiData";
import { signal } from "@preact/signals";
import {
  makeUrl,
  createResponse,
  translations,
  nivBooks,
} from "./testUtils/mockBibleApiData";

let webGetMock: jest.Mock;

beforeEach(() => {
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
  return new FreeUseBibleAPI(API_ENDPOINT);
}

function createDataManager() {
  return createBibleDataManager(createApi());
}

function createHighlightsManagerMock() {
  return {
    getChapterHighlights: jest.fn().mockReturnValue(signal({ highlights: [] })),
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

function getDisplayedBookIds(selector: BibleSelectorState): string[] {
  const oldTestament = selector.oldTestamentRows.value
    .flat()
    .map((book) => book.id);
  const newTestament = selector.newTestamentRows.value
    .flat()
    .map((book) => book.id);
  return [...oldTestament, ...newTestament];
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
    createHighlightsManagerMock() as any
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
    setWebResponses(createDefaultManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createBibleSelectorState(
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
    setWebResponses(createDefaultManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    await pane.tab!.readingState.selectChapter("EXO", 2);

    const selector = createBibleSelectorState(
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
    setWebResponses(createDefaultManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createBibleSelectorState(
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
    setWebResponses(createDefaultManagerResponseMap());
    const { dataManager, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createBibleSelectorState(
      dataManager,
      tabsManager,
      panesManager
    );

    await selector.setOpen(true, pane);
    expect(selector.isOpen.value).toBe(true);

    selector.setExpandedBook("EXO");

    expect(selector.expandedBookId.value).toBe("EXO");
  });

  it("selectTranslation() changes selector state but not reading state", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const { dataManager, readingState, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createBibleSelectorState(
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

    expect(selector.currentTranslationId.value).toBe("BSB");
    expect(selector.currentBookId.value).toBe("GEN");
    expect(selector.currentChapterNumber.value).toBe(1);
    expect(readingState.translationId.value).toBe("BSB");
    expect(readingState.bookId.value).toBe("GEN");
    expect(readingState.chapterNumber.value).toBe(1);
  });

  it("selectChapter() applies selector translation and chapter to reading state", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const { dataManager, readingState, pane, tabsManager, panesManager } =
      await createManagersWithSelectedPane();

    const selector = createBibleSelectorState(
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
        createHighlightsManagerMock() as any
      );
      const panesManager = createPanes(tabsManager, tabsManager.selectedTabId);

      const initialPane = panesManager.panes.value[0]!;
      panesManager.openInPane(initialPane.id, { component: null });
      const tablessPane = panesManager.panes.value[0]!;

      return { dataManager, tabsManager, panesManager, tablessPane };
    }

    it("setOpen() selects DEFAULT_TRANSLATION_ID (BSB) when no pane has a tab but BSB is in available translations", async () => {
      setWebResponses(createDefaultManagerResponseMap());
      const { dataManager, tabsManager, panesManager, tablessPane } =
        createManagersWithTablessPane();

      const selector = createBibleSelectorState(
        dataManager,
        tabsManager,
        panesManager
      );
      await selector.setOpen(true, tablessPane);

      expect(selector.isOpen.value).toBe(true);
      expect(selector.selectedTranslationId.value).toBe("BSB");
    });

    it("setOpen() uses first available translation when DEFAULT_TRANSLATION_ID (BSB) is not in available translations", async () => {
      setWebResponses({
        [makeUrl("/api/available_translations.json")]: createResponse({
          translations: [translations.translations[1]!],
        }),
        [makeUrl("/api/NIV/books.json")]: createResponse(nivBooks),
      });
      const { dataManager, tabsManager, panesManager, tablessPane } =
        createManagersWithTablessPane();

      const selector = createBibleSelectorState(
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
        [makeUrl("/api/available_translations.json")]: createResponse({
          translations: [],
        }),
      });
      const { dataManager, tabsManager, panesManager, tablessPane } =
        createManagersWithTablessPane();

      const selector = createBibleSelectorState(
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
