/** @jest-environment ./test/env/CasualOSEnvironment.ts */

import { render, h } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
// import * as appHooks from "preact/hooks";
import { useBibleReadingState } from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type TranslationBookChapter,
  type TranslationBooks,
} from "@packages/seed-bible-refresh/seed-bible/managers/FreeUseBibleAPI";
import type { BibleReadingState } from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import {
  type BibleSelectorState,
  useBibleSelector,
} from "@packages/seed-bible-refresh/seed-bible/managers/BibleSelectorManager";
import type {
  Pane,
  PanesManager,
} from "@packages/seed-bible-refresh/seed-bible/managers/PanesManager";
import type {
  ReaderTab,
  TabsManager,
} from "@packages/seed-bible-refresh/seed-bible/managers/TabsManager";

// type UseBibleSelectorFn = typeof useBibleSelector;

type WebResponse<T> = {
  status: number;
  statusText: string;
  data: Promise<T>;
};

type WebResponseMap = Record<string, WebResponse<unknown>>;

const API_ENDPOINT = "https://example.test";

const translations: AvailableTranslations = {
  translations: [
    {
      id: "BSB",
      name: "Berean Standard Bible",
      englishName: "Berean Standard Bible",
      website: "https://example.com",
      licenseUrl: "https://example.com/license",
      shortName: "BSB",
      language: "eng",
      textDirection: "ltr",
      availableFormats: ["json"],
      listOfBooksApiLink: "/api/BSB/books.json",
      numberOfBooks: 66,
      totalNumberOfChapters: 1189,
      totalNumberOfVerses: 31102,
    },
    {
      id: "NIV",
      name: "New International Version",
      englishName: "New International Version",
      website: "https://example.com",
      licenseUrl: "https://example.com/license",
      shortName: "NIV",
      language: "eng",
      textDirection: "ltr",
      availableFormats: ["json"],
      listOfBooksApiLink: "/api/NIV/books.json",
      numberOfBooks: 66,
      totalNumberOfChapters: 1189,
      totalNumberOfVerses: 31102,
    },
  ],
};

const bsbBooks: TranslationBooks = {
  translation: translations.translations[0]!,
  books: [
    {
      id: "GEN",
      name: "Genesis",
      commonName: "Genesis",
      title: null,
      order: 1,
      numberOfChapters: 50,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/GEN/1.json",
      lastChapterNumber: 50,
      lastChapterApiLink: "/api/BSB/GEN/50.json",
      totalNumberOfVerses: 1533,
    },
    {
      id: "EXO",
      name: "Exodus",
      commonName: "Exodus",
      title: null,
      order: 2,
      numberOfChapters: 40,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/EXO/1.json",
      lastChapterNumber: 40,
      lastChapterApiLink: "/api/BSB/EXO/40.json",
      totalNumberOfVerses: 1213,
    },
    {
      id: "MAT",
      name: "Matthew",
      commonName: "Matthew",
      title: null,
      order: 40,
      numberOfChapters: 28,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/MAT/1.json",
      lastChapterNumber: 28,
      lastChapterApiLink: "/api/BSB/MAT/28.json",
      totalNumberOfVerses: 1071,
    },
  ],
};

const nivBooks: TranslationBooks = {
  translation: translations.translations[1]!,
  books: [
    {
      id: "MAT",
      name: "Matthew",
      commonName: "Matthew",
      title: null,
      order: 40,
      numberOfChapters: 28,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/NIV/MAT/1.json",
      lastChapterNumber: 28,
      lastChapterApiLink: "/api/NIV/MAT/28.json",
      totalNumberOfVerses: 1071,
    },
  ],
};

let webGetMock: jest.Mock;

beforeEach(() => {
  webGetMock = jest.fn();
  (globalThis as any).web = {
    get: webGetMock,
  };
});

afterEach(() => {
  delete (globalThis as any).web;
});

function createResponse<T>(
  payload: T,
  status: number = 200,
  statusText: string = "OK"
): WebResponse<T> {
  return {
    status,
    statusText,
    data: Promise.resolve(payload),
  };
}

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

function makeUrl(path: string): string {
  return `${API_ENDPOINT}${path}`;
}

function makeChapter(
  translationBooks: TranslationBooks,
  book: string,
  chapter: number
): TranslationBookChapter {
  const selectedBook =
    translationBooks.books.find((entry) => entry.id === book) ??
    translationBooks.books[0]!;

  return {
    translation: translationBooks.translation,
    book: selectedBook,
    thisChapterLink: `/api/${translationBooks.translation.id}/${book}/${chapter}.json`,
    thisChapterAudioLinks: {},
    nextChapterApiLink: `/api/${translationBooks.translation.id}/${book}/${chapter + 1}.json`,
    nextChapterAudioLinks: {},
    previousChapterApiLink:
      chapter > 1
        ? `/api/${translationBooks.translation.id}/${book}/${chapter - 1}.json`
        : null,
    previousChapterAudioLinks: chapter > 1 ? {} : null,
    numberOfVerses: 2,
    chapter: {
      number: chapter,
      content: [
        { type: "verse", number: 1, content: ["Verse 1"] },
        { type: "verse", number: 2, content: ["Verse 2"] },
      ],
      footnotes: [],
    },
  };
}

function createDefaultResponseMap(): WebResponseMap {
  return {
    [makeUrl("/api/available_translations.json")]: createResponse(translations),
    [makeUrl("/api/BSB/books.json")]: createResponse(bsbBooks),
    [makeUrl("/api/NIV/books.json")]: createResponse(nivBooks),
    [makeUrl("/api/BSB/GEN/1.json")]: createResponse(
      makeChapter(bsbBooks, "GEN", 1)
    ),
    [makeUrl("/api/BSB/EXO/2.json")]: createResponse(
      makeChapter(bsbBooks, "EXO", 2)
    ),
    [makeUrl("/api/NIV/MAT/1.json")]: createResponse(
      makeChapter(nivBooks, "MAT", 1)
    ),
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
  const oldTestament = selector.oldTestamentRows.flat().map((book) => book.id);
  const newTestament = selector.newTestamentRows.flat().map((book) => book.id);
  return [...oldTestament, ...newTestament];
}

function createTab(readingState: BibleReadingState): ReaderTab {
  return {
    id: "tab-test",
    title: "Tab Test",
    readingState,
  };
}

function createPane(readingState: BibleReadingState): Pane {
  return {
    id: "pane-test",
    tab: createTab(readingState),
    component: null,
    detached: false,
    x: 0,
    y: 0,
    width: 480,
    height: 320,
  };
}

function createTabsManager(readingState: BibleReadingState): TabsManager {
  const tabs = signal<ReaderTab[]>([createTab(readingState)]);
  const selectedTabId = signal<string>(tabs.value[0]!.id);

  return {
    tabs,
    selectedTabId,
    addTab: jest.fn(() => createTab(readingState)),
    removeTab: jest.fn(),
    selectTab: jest.fn(),
  } as unknown as TabsManager;
}

function createPanesManager(pane: Pane): PanesManager {
  return {
    panes: signal<Pane[]>([pane]),
    selectedPaneId: signal<string | null>(pane.id),
    selectedPane: signal<Pane | null>(pane),
    layout: signal("single"),
    layoutOptions: [],
    setLayout: jest.fn(),
    addPane: jest.fn(() => pane),
    removePane: jest.fn(),
    duplicatePane: jest.fn(() => pane),
    setPaneTab: jest.fn(),
    setPaneComponent: jest.fn(),
    clearPane: jest.fn(),
    detachPane: jest.fn(),
    attachPane: jest.fn(),
    moveDetachedPane: jest.fn(),
    resizeDetachedPane: jest.fn(),
    selectPane: jest.fn(),
    getSelectedPane: jest.fn(() => pane),
    applyLayout: jest.fn(),
  } as unknown as PanesManager;
}

function mountSelector(
  api: FreeUseBibleAPI,
  tabsManager: TabsManager,
  panesManager: PanesManager
) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  let latestState: BibleSelectorState | null = null;

  function TestHarness() {
    latestState = useBibleSelector(api, tabsManager, panesManager);
    return null;
  }

  act(() => {
    render(h(TestHarness, {}), container);
  });

  const getState = (): BibleSelectorState => {
    if (!latestState) {
      throw new Error("Selector state is not available.");
    }
    return latestState;
  };

  const unmount = () => {
    act(() => {
      render(null, container);
    });
    container.remove();
  };

  return {
    getState,
    unmount,
  };
}

describe("useBibleSelector", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("setOpen() opens the selector and displays books", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();
    const readingState = useBibleReadingState(api);
    const pane = createPane(readingState);
    const tabsManager = createTabsManager(readingState);
    const panesManager = createPanesManager(pane);
    await waitForInitialLoad(readingState);

    const { getState, unmount } = mountSelector(api, tabsManager, panesManager);
    try {
      act(() => {
        getState().setOpen(true, pane);
      });

      await waitFor(() => getState().isOpen.value === true);

      expect(getState().isOpen.value).toBe(true);
      expect(getDisplayedBookIds(getState())).toEqual(["GEN", "EXO", "MAT"]);
    } finally {
      unmount();
    }
  });

  it("setSearch() filters books", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();
    const readingState = useBibleReadingState(api);
    const pane = createPane(readingState);
    const tabsManager = createTabsManager(readingState);
    const panesManager = createPanesManager(pane);
    await waitForInitialLoad(readingState);

    const { getState, unmount } = mountSelector(api, tabsManager, panesManager);
    try {
      act(() => {
        getState().setOpen(true, pane);
      });
      await waitFor(() => getState().isOpen.value === true);

      act(() => {
        getState().setSearch("exo");
      });

      await waitFor(() => getDisplayedBookIds(getState()).length === 1);
      expect(getDisplayedBookIds(getState())).toEqual(["EXO"]);
    } finally {
      unmount();
    }
  });

  it("setExpandedBook() sets expandedBookId", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();
    const readingState = useBibleReadingState(api);
    const pane = createPane(readingState);
    const tabsManager = createTabsManager(readingState);
    const panesManager = createPanesManager(pane);
    await waitForInitialLoad(readingState);

    const { getState, unmount } = mountSelector(api, tabsManager, panesManager);
    try {
      act(() => {
        getState().setOpen(true, pane);
      });
      await waitFor(() => getState().isOpen.value === true);

      act(() => {
        getState().setExpandedBook("EXO");
      });

      expect(getState().expandedBookId.value).toBe("EXO");
    } finally {
      unmount();
    }
  });

  it("selectTranslation() changes the reading state translation", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();
    const readingState = useBibleReadingState(api);
    const pane = createPane(readingState);
    const tabsManager = createTabsManager(readingState);
    const panesManager = createPanesManager(pane);
    await waitForInitialLoad(readingState);

    const { getState, unmount } = mountSelector(api, tabsManager, panesManager);
    try {
      act(() => {
        getState().setOpen(true, pane);
      });

      await act(async () => {
        await getState().selectTranslation("NIV");
      });

      expect(readingState.translationId.value).toBe("NIV");
      expect(readingState.bookId.value).toBe("MAT");
      expect(readingState.chapterNumber.value).toBe(1);
    } finally {
      unmount();
    }
  });

  it("selectChapter() changes the reading state chapter", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();
    const readingState = useBibleReadingState(api);
    const pane = createPane(readingState);
    const tabsManager = createTabsManager(readingState);
    const panesManager = createPanesManager(pane);
    await waitForInitialLoad(readingState);

    const { getState, unmount } = mountSelector(api, tabsManager, panesManager);
    try {
      act(() => {
        getState().setOpen(true, pane);
      });

      await act(async () => {
        await getState().selectChapter("EXO", 2);
      });

      expect(readingState.bookId.value).toBe("EXO");
      expect(readingState.chapterNumber.value).toBe(2);
    } finally {
      unmount();
    }
  });
});
