import {
  createTabs,
  type ReaderTab,
} from "@packages/seed-bible-refresh/seed-bible/managers/TabsManager";
import type { BibleReadingState } from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type TranslationBookChapter,
  type TranslationBooks,
} from "@packages/seed-bible-refresh/seed-bible/managers/FreeUseBibleAPI";

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
let botChangedListener: ((that: unknown) => Promise<void> | void) | null;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  webGetMock = jest.fn();
  botChangedListener = null;
  logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

  (globalThis as any).web = {
    get: webGetMock,
  };

  (globalThis as any).configBot = {
    tags: {},
  };

  (globalThis as any).os = {
    addBotListener: jest.fn(
      (_bot: unknown, event: string, listener: typeof botChangedListener) => {
        if (event === "onBotChanged") {
          botChangedListener = listener;
        }
      }
    ),
  };
});

afterEach(() => {
  logSpy.mockRestore();
  delete (globalThis as any).web;
  delete (globalThis as any).configBot;
  delete (globalThis as any).os;
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

async function waitForTabsToLoad(tabs: ReaderTab[]): Promise<void> {
  await Promise.all(tabs.map((tab) => waitForInitialLoad(tab.readingState)));
}

describe("createTabs", () => {
  it("addTab() creates a new tab with new reading state", async () => {
    setWebResponses(createDefaultResponseMap());
    const manager = createTabs(createApi());
    await waitForTabsToLoad(manager.tabs.value);

    const existingReadingStates = manager.tabs.value.map(
      (tab) => tab.readingState
    );

    const nextTab = manager.addTab();
    await waitForInitialLoad(nextTab.readingState);

    expect(manager.tabs.value).toHaveLength(3);
    expect(manager.tabs.value[2]).toBe(nextTab);
    expect(existingReadingStates).not.toContain(nextTab.readingState);
    expect(nextTab.id).toBe("tab-3");
    expect(nextTab.title).toBe("Tab 3");
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("removeTab() removes the given tab", async () => {
    setWebResponses(createDefaultResponseMap());
    const manager = createTabs(createApi());
    await waitForTabsToLoad(manager.tabs.value);

    manager.removeTab("tab-2");

    expect(manager.tabs.value).toHaveLength(1);
    expect(manager.tabs.value.some((tab) => tab.id === "tab-2")).toBe(false);
  });

  it("selectTab() sets the selected tab", async () => {
    setWebResponses(createDefaultResponseMap());
    const manager = createTabs(createApi());
    await waitForTabsToLoad(manager.tabs.value);

    manager.selectTab("tab-2");

    expect(manager.selectedTabId.value).toBe("tab-2");
  });

  it("syncs the selected tab to match configBot", async () => {
    setWebResponses(createDefaultResponseMap());
    const manager = createTabs(createApi());
    await waitForTabsToLoad(manager.tabs.value);
    manager.selectTab("tab-2");

    (globalThis as any).configBot.tags.translation = "NIV";
    (globalThis as any).configBot.tags.book = "MAT";
    (globalThis as any).configBot.tags.chapter = 1;

    await botChangedListener?.({
      tags: ["translation", "book", "chapter"],
    });

    const selectedTab = manager.tabs.value.find(
      (tab) => tab.id === manager.selectedTabId.value
    );
    expect(selectedTab).toBeDefined();
    await waitForInitialLoad(selectedTab!.readingState);

    expect(selectedTab!.readingState.translationId.value).toBe("NIV");
    expect(selectedTab!.readingState.bookId.value).toBe("MAT");
    expect(selectedTab!.readingState.chapterNumber.value).toBe(1);
  });
});
