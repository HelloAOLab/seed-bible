import {
  createBibleReadingState as createRawBibleReadingState,
  type BibleReadingState,
  type VerseDecoration,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  FreeUseBibleAPI,
  type ChapterVerse,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  EXAMPLE_API_ENDPOINT,
  ALT_API_ENDPOINT,
  altTranslations,
  bsbBooks,
  createReadingManagerResponseMap,
  createResponse,
  makeChapter,
  makeAltUrl,
  makeExampleUrl,
  nivBooks,
  translations,
  type WebResponseMap,
} from "./testUtils/mockBibleApiData";
import { effect, signal } from "@preact/signals";

const nivTranslation = translations.translations[1]!;

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
    getChapterHighlights: jest
      .fn()
      .mockReturnValue(
        signal({ highlights: [{ colorId: "yellow", verse: 1 }] })
      ),
    highlightVerses: jest.fn().mockResolvedValue(undefined),
    unhighlightVerses: jest.fn().mockResolvedValue(undefined),
    highlightVerse: jest.fn().mockResolvedValue(undefined),
    unhighlightVerse: jest.fn().mockResolvedValue(undefined),
    saveChapterHighlights: jest.fn().mockResolvedValue(undefined),
  };
}

function createBibleReadingState(
  dataManager: ReturnType<typeof createDataManager>,
  options: { initialTranslationId?: string | null } & {
    initialBookId?: string | null;
    initialChapterNumber?: number | null;
  } = {}
) {
  return createRawBibleReadingState(
    dataManager,
    createHighlightsManagerMock() as any,
    options
  );
}

function makeVerse(number: number): ChapterVerse {
  return {
    type: "verse",
    number,
    content: [`Verse ${number}`],
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

describe("createBibleReadingState", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("uses AAB by default", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    expect(state.translationId.value).toBe("AAB");
  });

  it("loads highlights for the current chapter during initial load", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const highlightsManager = createHighlightsManagerMock();
    const state = createRawBibleReadingState(
      createDataManager(),
      highlightsManager as any
    );

    await waitForInitialLoad(state);

    expect(highlightsManager.getChapterHighlights).toHaveBeenCalledWith(
      "AAB",
      "GEN",
      1
    );
    expect(state.highlights.value).toEqual({
      highlights: [{ colorId: "yellow", verse: 1 }],
    });
  });

  it("highlightSelectedVerses() applies a highlight to selected verses and reloads chapter highlights", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const highlightsManager = createHighlightsManagerMock();
    const chapterHighlights = signal({ highlights: [] as any[] });
    highlightsManager.getChapterHighlights.mockReturnValue(chapterHighlights);
    highlightsManager.highlightVerses.mockImplementation(async () => {
      chapterHighlights.value = {
        highlights: [
          { colorId: "yellow", verse: 1 },
          { colorId: "yellow", verse: 2 },
        ],
      };
    });

    const state = createRawBibleReadingState(
      createDataManager(),
      highlightsManager as any
    );
    await waitForInitialLoad(state);

    state.selectVerse(
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse: makeVerse(1),
        translationId: "AAB",
      },
      1,
      1
    );
    state.selectVerse(
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse: makeVerse(2),
        translationId: "AAB",
      },
      2,
      2
    );

    await state.highlightSelectedVerses({ colorId: "yellow" });

    expect(highlightsManager.highlightVerses).toHaveBeenCalledTimes(1);
    expect(highlightsManager.highlightVerses).toHaveBeenCalledWith(
      "AAB",
      "GEN",
      1,
      [1, 2],
      { colorId: "yellow" }
    );

    expect(highlightsManager.getChapterHighlights).toHaveBeenCalledTimes(1);
    expect(state.highlights.value).toEqual({
      highlights: [
        { colorId: "yellow", verse: 1 },
        { colorId: "yellow", verse: 2 },
      ],
    });
  });

  it("unhighlightSelectedVerses() removes highlights from selected verses and reloads chapter highlights", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const highlightsManager = createHighlightsManagerMock();
    const chapterHighlights = signal({
      highlights: [
        { colorId: "yellow", verse: 1 },
        { colorId: "yellow", verse: 2 },
      ],
    });
    highlightsManager.getChapterHighlights.mockReturnValue(chapterHighlights);
    highlightsManager.unhighlightVerses.mockImplementation(async () => {
      chapterHighlights.value = { highlights: [] };
    });

    const state = createRawBibleReadingState(
      createDataManager(),
      highlightsManager as any
    );
    await waitForInitialLoad(state);

    state.selectVerse(
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse: makeVerse(1),
        translationId: "AAB",
      },
      1,
      1
    );
    state.selectVerse(
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse: makeVerse(2),
        translationId: "AAB",
      },
      2,
      2
    );

    await state.unhighlightSelectedVerses();

    expect(highlightsManager.unhighlightVerses).toHaveBeenCalledTimes(1);
    expect(highlightsManager.unhighlightVerses).toHaveBeenCalledWith(
      "AAB",
      "GEN",
      1,
      [1, 2]
    );

    expect(highlightsManager.getChapterHighlights).toHaveBeenCalledTimes(1);
    expect(state.highlights.value).toEqual({ highlights: [] });
  });

  it("unhighlightSelectedVerses() does nothing when no verses are selected", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const highlightsManager = createHighlightsManagerMock();
    const state = createRawBibleReadingState(
      createDataManager(),
      highlightsManager as any
    );
    await waitForInitialLoad(state);

    await state.unhighlightSelectedVerses();

    expect(highlightsManager.unhighlightVerses).not.toHaveBeenCalled();
    expect(highlightsManager.getChapterHighlights).toHaveBeenCalledTimes(1);
  });

  it("decorateVerses() adds a decoration for one or more verses and returns its ID", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const decorationId = state.decorateVerses("GEN", 1, [2, 1, 2], {
      className: "sb-test-decoration",
      style: {
        outline: "1px solid red",
      },
    });

    expect(decorationId.startsWith("decoration-")).toBe(true);
    expect(state.decorations.value).toEqual<VerseDecoration[]>([
      {
        id: decorationId,
        translationId: null,
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1, 2],
        className: "sb-test-decoration",
        style: {
          outline: "1px solid red",
        },
      },
    ]);
  });

  it("removeDecoration() removes an existing decoration", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const decorationId = state.decorateVerses("GEN", 1, [1], {
      className: "sb-test-decoration",
    });

    state.removeDecoration(decorationId);

    expect(state.decorations.value).toEqual([]);
  });

  it("decorateVerses() can target specific content in the verse", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const decorationId = state.decorateVerses("GEN", 1, [1], {
      targetContent: "created the",
      className: "sb-piece-decoration",
      style: {
        textDecoration: "underline",
      },
    });

    expect(state.decorations.value).toEqual<VerseDecoration[]>([
      {
        id: decorationId,
        translationId: null,
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        targetContent: "created the",
        className: "sb-piece-decoration",
        style: {
          textDecoration: "underline",
        },
      },
    ]);
  });

  it("decorateVerses() can store a start/end index range with target content", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const decorationId = state.decorateVerses("GEN", 1, [1], {
      targetContent: "created",
      startIndex: 20,
      endIndex: 45,
      className: "sb-piece-decoration",
    });

    expect(state.decorations.value).toEqual<VerseDecoration[]>([
      {
        id: decorationId,
        translationId: null,
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        targetContent: "created",
        startIndex: 20,
        endIndex: 45,
        className: "sb-piece-decoration",
      },
    ]);
  });

  it("decorateVerses() can store a start/end index range without target content", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const decorationId = state.decorateVerses("GEN", 1, [1], {
      startIndex: 31,
      endIndex: 42,
      className: "sb-index-range-decoration",
      style: {
        backgroundColor: "yellow",
      },
    });

    expect(state.decorations.value).toEqual<VerseDecoration[]>([
      {
        id: decorationId,
        translationId: null,
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        startIndex: 31,
        endIndex: 42,
        className: "sb-index-range-decoration",
        style: {
          backgroundColor: "yellow",
        },
      },
    ]);
  });

  it("decorateVerses() stores removeAfterMs on the decoration", async () => {
    jest.useRealTimers();
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    jest.useFakeTimers();
    try {
      const decorationId = state.decorateVerses("GEN", 1, [1], {
        className: "sb-timeout-decoration",
        removeAfterMs: 1500,
      });

      expect(state.decorations.value).toEqual<VerseDecoration[]>([
        {
          id: decorationId,
          translationId: null,
          bookId: "GEN",
          chapterNumber: 1,
          verses: [1],
          className: "sb-timeout-decoration",
          removeAfterMs: 1500,
        },
      ]);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it("decorateVerses() auto-removes a decoration after removeAfterMs", async () => {
    jest.useRealTimers();
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    jest.useFakeTimers();
    try {
      const decorationId = state.decorateVerses("GEN", 1, [1], {
        className: "sb-temporary-decoration",
        removeAfterMs: 100,
      });

      expect(state.decorations.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: decorationId,
            removeAfterMs: 100,
          }),
        ])
      );

      jest.advanceTimersByTime(99);
      expect(state.decorations.value.some((d) => d.id === decorationId)).toBe(
        true
      );

      jest.advanceTimersByTime(1);
      expect(state.decorations.value.some((d) => d.id === decorationId)).toBe(
        false
      );
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it("clears decorations when the chapter changes", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    state.decorateVerses("GEN", 1, [1, 2], {
      className: "sb-test-decoration",
    });

    await state.selectChapter("GEN", 2);

    expect(state.decorations.value).toEqual([]);
  });

  it("changing the chapter keeps decorations that target the new chapter even when preserveOnChapterChange is false", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const decorationId = state.decorateVerses("GEN", 2, [3], {
      className: "sb-next-chapter-decoration",
      preserveOnChapterChange: false,
    });

    await state.selectChapter("GEN", 2);

    expect(state.decorations.value).toEqual([
      {
        id: decorationId,
        translationId: null,
        bookId: "GEN",
        chapterNumber: 2,
        verses: [3],
        className: "sb-next-chapter-decoration",
        style: undefined,
        preserveOnChapterChange: false,
      },
    ]);
  });

  it("doesn't clear decorations that should be preserved when the chapter changes", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    state.decorateVerses("GEN", 1, [5], {
      className: "sb-test-decoration-removed",
    });

    state.decorateVerses("GEN", 1, [1, 2], {
      className: "sb-test-decoration",
      preserveOnChapterChange: true,
    });

    await state.selectChapter("GEN", 2);

    expect(state.decorations.value).toEqual([
      {
        id: expect.any(String),
        translationId: null,
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1, 2],
        className: "sb-test-decoration",
        style: undefined,
        preserveOnChapterChange: true,
      },
    ]);
  });

  it("loads books for AAB on initialization", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/books.json")
    );
    expect(state.translationBooks.value).toEqual(bsbBooks);
  });

  it("selectBook() loads the selected book", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectBook("EXO");

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/EXO/1.json")
    );
    expect(state.bookId.value).toBe("EXO");
    expect(state.chapterNumber.value).toBe(1);
    expect(state.chapterData.value?.book.id).toBe("EXO");
  });

  it("selectChapter() loads the selected chapter", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectChapter("GEN", 5);

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/GEN/5.json")
    );
    expect(state.bookId.value).toBe("GEN");
    expect(state.chapterNumber.value).toBe(5);
    expect(state.chapterData.value?.chapter.number).toBe(5);
  });

  it("selectTranslationAndChapter() can request scrolling to verse", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectTranslationAndChapter("AAB", "GEN", 5, {
      scrollToVerse: 3,
    });

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/GEN/5.json")
    );
    expect(state.translationId.value).toBe("AAB");
    expect(state.bookId.value).toBe("GEN");
    expect(state.chapterNumber.value).toBe(5);
    expect(state.scrollToVerse.value).toBe(3);
  });

  it("selectTranslationAndChapter() updates scrollToVerse in the same batch as chapterData", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const chapterFiveScrollSnapshots: Array<number | null> = [];
    const stop = effect(() => {
      const chapter = state.chapterData.value;
      if (chapter?.book.id === "GEN" && chapter.chapter.number === 5) {
        chapterFiveScrollSnapshots.push(state.scrollToVerse.value);
      }
    });

    await state.selectTranslationAndChapter("AAB", "GEN", 5, {
      scrollToVerse: 3,
    });

    stop();

    expect(chapterFiveScrollSnapshots).toEqual([3]);
    expect(state.chapterData.value?.book.id).toBe("GEN");
    expect(state.chapterData.value?.chapter.number).toBe(5);
    expect(state.scrollToVerse.value).toBe(3);
  });

  it("decorateVerses() supports specifying a translationId so decorations can only work within the same translation", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/NIV/books.json")] = createResponse({
      ...bsbBooks,
      translation: nivTranslation,
    });
    responses[makeExampleUrl("/api/NIV/GEN/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "GEN", 1),
      translation: nivTranslation,
      book: bsbBooks.books.find((book) => book.id === "GEN")!,
      thisChapterLink: "/api/NIV/GEN/1.json",
      nextChapterApiLink: "/api/NIV/GEN/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const decorationId = state.decorateVerses("GEN", 1, [1], {
      className: "sb-any-translation-decoration",
      translationId: "NIV",
    });

    expect(state.decorations.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: decorationId,
          translationId: "NIV",
          bookId: "GEN",
          chapterNumber: 1,
          verses: [1],
          className: "sb-any-translation-decoration",
        }),
      ])
    );

    await state.selectTranslationAndChapter("NIV", "GEN", 1);

    expect(state.decorations.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: decorationId,
          translationId: "NIV",
          bookId: "GEN",
          chapterNumber: 1,
          verses: [1],
        }),
      ])
    );
  });

  it("loads highlights when the chapter changes", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const highlightsManager = createHighlightsManagerMock();
    const state = createRawBibleReadingState(
      createDataManager(),
      highlightsManager as any
    );
    await waitForInitialLoad(state);

    await state.selectChapter("GEN", 5);

    expect(highlightsManager.getChapterHighlights).toHaveBeenNthCalledWith(
      2,
      "AAB",
      "GEN",
      5
    );
  });

  it("loadNextChapter() loads the next chapter", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.loadNextChapter();

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/GEN/2.json")
    );
    expect(state.chapterNumber.value).toBe(2);
    expect(state.chapterData.value?.chapter.number).toBe(2);
  });

  it("loadPreviousChapter() loads the previous chapter", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);
    await state.selectChapter("GEN", 2);

    await state.loadPreviousChapter();

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/GEN/1.json")
    );
    expect(state.chapterNumber.value).toBe(1);
    expect(state.chapterData.value?.chapter.number).toBe(1);
  });

  it("selectVerse() selects a verse", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const verse = makeVerse(2);
    state.selectVerse(
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse,
        translationId: "AAB",
      },
      100,
      200
    );

    expect(state.selectedVerses.value).toEqual([
      {
        bookId: "GEN",
        chapterNumber: 1,
        verse,
        translationId: "AAB",
        selectionX: 100,
        selectionY: 200,
        selectedAt: expect.any(Number),
      },
    ]);
  });

  it("the selected footnote is cleared when the chapter changes", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "GEN", 1),
      chapter: {
        number: 1,
        content: [
          {
            type: "verse",
            number: 1,
            content: ["Verse 1", { noteId: 7 }],
          },
          {
            type: "verse",
            number: 2,
            content: ["Verse 2"],
          },
        ],
        footnotes: [
          {
            noteId: 7,
            text: "Footnote text",
            caller: "+",
          },
        ],
      },
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    state.selectFootnote(7);

    expect(state.selectedFootnote.value).toEqual({
      note: {
        noteId: 7,
        text: "Footnote text",
        caller: "+",
      },
      chapter: state.chapterData.value,
      verse: {
        type: "verse",
        number: 1,
        content: ["Verse 1", { noteId: 7 }],
      },
    });

    await state.selectChapter("GEN", 2);

    expect(state.selectedFootnote.value).toBeNull();
  });

  it("selectFootnote() selects matching footnote and verse", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "GEN", 1),
      chapter: {
        number: 1,
        content: [
          {
            type: "verse",
            number: 1,
            content: ["Verse 1", { noteId: 7 }],
          },
          {
            type: "verse",
            number: 2,
            content: ["Verse 2"],
          },
        ],
        footnotes: [
          {
            noteId: 7,
            text: "Footnote text",
            caller: "+",
          },
        ],
      },
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    state.selectFootnote(7);

    expect(state.selectedFootnote.value).toEqual({
      note: {
        noteId: 7,
        text: "Footnote text",
        caller: "+",
      },
      chapter: state.chapterData.value,
      verse: {
        type: "verse",
        number: 1,
        content: ["Verse 1", { noteId: 7 }],
      },
    });
  });

  it("selectFootnote() clears selected footnote when null is passed", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "GEN", 1),
      chapter: {
        number: 1,
        content: [
          {
            type: "verse",
            number: 1,
            content: ["Verse 1", { noteId: 3 }],
          },
        ],
        footnotes: [
          {
            noteId: 3,
            text: "Selected footnote",
            caller: "+",
          },
        ],
      },
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    state.selectFootnote(3);
    expect(state.selectedFootnote.value?.note.noteId).toBe(3);

    state.selectFootnote(null);
    expect(state.selectedFootnote.value).toBeNull();
  });

  it("selectFootnote() returns null when noteId does not exist", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "GEN", 1),
      chapter: {
        number: 1,
        content: [
          {
            type: "verse",
            number: 1,
            content: ["Verse 1", { noteId: 1 }],
          },
        ],
        footnotes: [
          {
            noteId: 1,
            text: "Known footnote",
            caller: "+",
          },
        ],
      },
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    state.selectFootnote(9999);

    expect(state.selectedFootnote.value).toBeNull();
  });

  it("selectTranslation() changes the translation", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeExampleUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "MAT", 1),
      translation: nivTranslation,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectTranslation("NIV");

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/books.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/MAT/1.json")
    );
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(1);
    expect(state.translationBooks.value?.translation.id).toBe("NIV");
    expect(state.chapterData.value?.translation.id).toBe("NIV");
  });

  it("the selected footnote is cleared when the translation changes", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "GEN", 1),
      chapter: {
        number: 1,
        content: [
          {
            type: "verse",
            number: 1,
            content: ["Verse 1", { noteId: 7 }],
          },
          {
            type: "verse",
            number: 2,
            content: ["Verse 2"],
          },
        ],
        footnotes: [
          {
            noteId: 7,
            text: "Footnote text",
            caller: "+",
          },
        ],
      },
    });
    responses[makeExampleUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeExampleUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "MAT", 1),
      translation: nivTranslation,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    state.selectFootnote(7);

    expect(state.selectedFootnote.value).toEqual({
      note: {
        noteId: 7,
        text: "Footnote text",
        caller: "+",
      },
      chapter: state.chapterData.value,
      verse: {
        type: "verse",
        number: 1,
        content: ["Verse 1", { noteId: 7 }],
      },
    });

    await state.selectTranslation("NIV");

    expect(state.selectedFootnote.value).toBeNull();
  });

  it("selectTranslation() supports available_translations URL", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeAltUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "MAT", 1),
      translation: altTranslations.translations[0]!,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
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

  it("selectTranslation() supports books URL and uses translation ID from the URL", async () => {
    const bsbAltBooks = {
      ...bsbBooks,
      translation: altTranslations.translations[1]!,
    };
    const responses = createReadingManagerResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/BSB/books.json")] = createResponse(bsbAltBooks);
    responses[makeAltUrl("/api/BSB/GEN/1.json")] = createResponse({
      ...makeChapter(bsbAltBooks, "GEN", 1),
      translation: altTranslations.translations[1]!,
      book: bsbAltBooks.books[0]!,
      thisChapterLink: "/api/BSB/GEN/1.json",
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectTranslation(`${ALT_API_ENDPOINT}/api/BSB/books.json`);

    expect(webGetMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/books.json"));
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/GEN/1.json"));
    expect(state.translationId.value).toBe("BSB");
    expect(state.bookId.value).toBe("GEN");
    expect(state.chapterNumber.value).toBe(1);
  });

  it("selectTranslation() falls back to first translation when books URL translation is missing", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeAltUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter(nivBooks, "MAT", 1),
      translation: altTranslations.translations[0]!,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectTranslation(`${ALT_API_ENDPOINT}/api/ZZZ/books.json`);

    expect(webGetMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/1.json"));
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(1);
  });

  it("selectTranslationAndChapter() changes translation, book, and chapter together", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeExampleUrl("/api/NIV/MAT/3.json")] = createResponse({
      ...makeChapter(nivBooks, "MAT", 3),
      translation: nivTranslation,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/3.json",
      nextChapterApiLink: "/api/NIV/MAT/4.json",
      previousChapterApiLink: "/api/NIV/MAT/2.json",
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectTranslationAndChapter("NIV", "MAT", 3);

    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/books.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/MAT/3.json")
    );
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(3);
    expect(state.chapterData.value?.translation.id).toBe("NIV");
    expect(state.chapterData.value?.book.id).toBe("MAT");
    expect(state.chapterData.value?.chapter.number).toBe(3);
  });

  it("selectTranslationAndChapter() supports available_translations URL", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeAltUrl("/api/NIV/MAT/2.json")] = createResponse({
      ...makeChapter(nivBooks, "MAT", 2),
      translation: altTranslations.translations[0]!,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/2.json",
      nextChapterApiLink: "/api/NIV/MAT/3.json",
      previousChapterApiLink: "/api/NIV/MAT/1.json",
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectTranslationAndChapter(
      `${ALT_API_ENDPOINT}/api/available_translations.json`,
      "MAT",
      2
    );

    expect(webGetMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/2.json"));
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(2);
  });

  it("selectTranslationAndChapter() supports books URL and uses translation ID from the URL", async () => {
    const bsbAltBooks = {
      ...bsbBooks,
      translation: altTranslations.translations[1]!,
    };
    const responses = createReadingManagerResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/BSB/books.json")] = createResponse(bsbAltBooks);
    responses[makeAltUrl("/api/BSB/GEN/2.json")] = createResponse({
      ...makeChapter(bsbAltBooks, "GEN", 2),
      translation: altTranslations.translations[1]!,
      book: bsbAltBooks.books[0]!,
      thisChapterLink: "/api/BSB/GEN/2.json",
      nextChapterApiLink: "/api/BSB/GEN/3.json",
      previousChapterApiLink: "/api/BSB/GEN/1.json",
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectTranslationAndChapter(
      `${ALT_API_ENDPOINT}/api/BSB/books.json`,
      "GEN",
      2
    );

    expect(webGetMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/books.json"));
    expect(webGetMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/GEN/2.json"));
    expect(state.translationId.value).toBe("BSB");
    expect(state.bookId.value).toBe("GEN");
    expect(state.chapterNumber.value).toBe(2);
  });

  it("uses initialTranslationId URL as endpoint and picks the first translation", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeAltUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "MAT", 1),
      translation: altTranslations.translations[0]!,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager(), {
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

  it("uses initialTranslationId books URL translation and falls back to first translation if missing", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeAltUrl("/api/available_translations.json")] =
      createResponse(altTranslations);
    responses[makeAltUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeAltUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter(bsbBooks, "MAT", 1),
      translation: altTranslations.translations[0]!,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager(), {
      initialTranslationId: `${ALT_API_ENDPOINT}/api/ZZZ/books.json`,
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
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/3.json")] = createResponse(
      { error: true },
      500,
      "Server Error"
    );

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await expect(state.selectChapter("GEN", 3)).resolves.toBeUndefined();

    expect(state.error.value).toBe(
      "Failed request to https://example.test/api/AAB/GEN/3.json. Status: 500 Server Error"
    );
    expect(state.loading.value).toBe(false);
  });
});
