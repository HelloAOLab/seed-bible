import {
  createBibleReadingState,
  type BibleReadingState,
} from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type ChapterVerse,
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
  ],
};

const books: TranslationBooks = {
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

const nivTranslation = {
  ...translations.translations[0]!,
  id: "NIV",
  shortName: "NIV",
  name: "New International Version",
  englishName: "New International Version",
  listOfBooksApiLink: "/api/NIV/books.json",
};

const nivBooks: TranslationBooks = {
  translation: nivTranslation,
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

const ALT_API_ENDPOINT = "https://alt.example";

const altTranslations: AvailableTranslations = {
  translations: [
    {
      ...nivTranslation,
      listOfBooksApiLink: "/api/NIV/books.json",
    },
    {
      ...translations.translations[0]!,
      id: "BSB",
      shortName: "BSB",
      listOfBooksApiLink: "/api/BSB/books.json",
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

function makeVerse(number: number): ChapterVerse {
  return {
    type: "verse",
    number,
    content: [`Verse ${number}`],
  };
}

function makeChapter(book: string, chapter: number): TranslationBookChapter {
  return {
    translation: books.translation,
    book: books.books.find((b) => b.id === book) ?? books.books[0]!,
    thisChapterLink: `/api/BSB/${book}/${chapter}.json`,
    thisChapterAudioLinks: {},
    nextChapterApiLink:
      chapter < 50 ? `/api/BSB/${book}/${chapter + 1}.json` : null,
    nextChapterAudioLinks: chapter < 50 ? {} : null,
    previousChapterApiLink:
      chapter > 1 ? `/api/BSB/${book}/${chapter - 1}.json` : null,
    previousChapterAudioLinks: chapter > 1 ? {} : null,
    numberOfVerses: 2,
    chapter: {
      number: chapter,
      content: [makeVerse(1), makeVerse(2)],
      footnotes: [],
    },
  };
}

function createDefaultResponseMap(): WebResponseMap {
  return {
    [makeUrl("/api/available_translations.json")]: createResponse(translations),
    [makeUrl("/api/BSB/books.json")]: createResponse(books),
    [makeUrl("/api/BSB/GEN/1.json")]: createResponse(makeChapter("GEN", 1)),
    [makeUrl("/api/BSB/GEN/2.json")]: createResponse(makeChapter("GEN", 2)),
    [makeUrl("/api/BSB/GEN/5.json")]: createResponse(makeChapter("GEN", 5)),
    [makeUrl("/api/BSB/EXO/1.json")]: createResponse(makeChapter("EXO", 1)),
  };
}

function makeAltUrl(path: string): string {
  return `${ALT_API_ENDPOINT}${path}`;
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

describe("createBibleReadingState", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("uses BSB by default", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    expect(state.translationId.value).toBe("BSB");
  });

  it("loads books for BSB on initialization", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    expect(webGetMock).toHaveBeenCalledWith(makeUrl("/api/BSB/books.json"));
    expect(state.translationBooks.value).toEqual(books);
  });

  it("selectBook() loads the selected book", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    await state.selectBook("EXO");

    expect(webGetMock).toHaveBeenCalledWith(makeUrl("/api/BSB/EXO/1.json"));
    expect(state.bookId.value).toBe("EXO");
    expect(state.chapterNumber.value).toBe(1);
    expect(state.chapterData.value?.book.id).toBe("EXO");
  });

  it("selectChapter() loads the selected chapter", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    await state.selectChapter("GEN", 5);

    expect(webGetMock).toHaveBeenCalledWith(makeUrl("/api/BSB/GEN/5.json"));
    expect(state.bookId.value).toBe("GEN");
    expect(state.chapterNumber.value).toBe(5);
    expect(state.chapterData.value?.chapter.number).toBe(5);
  });

  it("loadNextChapter() loads the next chapter", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    await state.loadNextChapter();

    expect(webGetMock).toHaveBeenCalledWith(makeUrl("/api/BSB/GEN/2.json"));
    expect(state.chapterNumber.value).toBe(2);
    expect(state.chapterData.value?.chapter.number).toBe(2);
  });

  it("loadPreviousChapter() loads the previous chapter", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);
    await state.selectChapter("GEN", 2);

    await state.loadPreviousChapter();

    expect(webGetMock).toHaveBeenCalledWith(makeUrl("/api/BSB/GEN/1.json"));
    expect(state.chapterNumber.value).toBe(1);
    expect(state.chapterData.value?.chapter.number).toBe(1);
  });

  it("selectVerse() selects a verse", async () => {
    setWebResponses(createDefaultResponseMap());
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    const verse = makeVerse(2);
    state.selectVerse(
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse,
        translationId: "BSB",
      },
      100,
      200
    );

    expect(state.selectedVerses.value).toEqual([
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse,
        translationId: "BSB",
        selectionX: 100,
        selectionY: 200,
        selectedAt: expect.any(Number),
      },
    ]);
  });

  it("selectTranslation() changes the translation", async () => {
    const responses = createDefaultResponseMap();
    responses[makeUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter("MAT", 1),
      translation: nivTranslation,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    await state.selectTranslation("NIV");

    expect(webGetMock).toHaveBeenCalledWith(makeUrl("/api/NIV/books.json"));
    expect(webGetMock).toHaveBeenCalledWith(makeUrl("/api/NIV/MAT/1.json"));
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(1);
    expect(state.translationBooks.value?.translation.id).toBe("NIV");
    expect(state.chapterData.value?.translation.id).toBe("NIV");
  });

  it("selectTranslation() supports available_translations URL", async () => {
    const responses = createDefaultResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeAltUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter("MAT", 1),
      translation: altTranslations.translations[0]!,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    await state.selectTranslation(
      `${ALT_API_ENDPOINT}/api/available_translations.json`
    );

    expect(webGetMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/1.json"));
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(1);
  });

  it("uses initialTranslationId URL as endpoint and picks the first translation", async () => {
    const responses = createDefaultResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeAltUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter("MAT", 1),
      translation: altTranslations.translations[0]!,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const api = createApi();

    const state = createBibleReadingState(api, {
      initialTranslationId: `${ALT_API_ENDPOINT}/api/available_translations.json`,
    });
    await waitForInitialLoad(state);

    expect(webGetMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/1.json"));
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(1);
  });

  it("catches errors and stores them in state.error", async () => {
    const responses = createDefaultResponseMap();
    responses[makeUrl("/api/BSB/GEN/3.json")] = createResponse(
      { error: true },
      500,
      "Server Error"
    );

    setWebResponses(responses);
    const api = createApi();

    const state = createBibleReadingState(api);
    await waitForInitialLoad(state);

    await expect(state.selectChapter("GEN", 3)).resolves.toBeUndefined();

    expect(state.error.value).toBe(
      "Failed request to https://example.test/api/BSB/GEN/3.json. Status: 500 Server Error"
    );
    expect(state.loading.value).toBe(false);
  });
});
