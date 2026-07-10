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
  aabBooks,
} from "./testUtils/mockBibleApiData";
import { effect, signal } from "@preact/signals";
import type { Mock } from "vitest";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n";
import type {
  DiscoverManager,
  DiscoverProviderResults,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import {
  createBibleReadingExtensionManager,
  type ReadingExtensionInstance,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingExtensionManager";

const nivTranslation = translations.translations[1]!;

let fetchMock: Mock;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setWebResponses(responses: WebResponseMap): void {
  fetchMock.mockImplementation((url: string) => {
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
    getChapterHighlights: vi
      .fn()
      .mockReturnValue(
        signal({ highlights: [{ colorId: "yellow", verse: 1 }] })
      ),
    highlightVerses: vi.fn().mockResolvedValue(undefined),
    unhighlightVerses: vi.fn().mockResolvedValue(undefined),
    highlightVerse: vi.fn().mockResolvedValue(undefined),
    unhighlightVerse: vi.fn().mockResolvedValue(undefined),
    saveChapterHighlights: vi.fn().mockResolvedValue(undefined),
  };
}

function createBibleReadingState(
  dataManager: ReturnType<typeof createDataManager>,
  options: { initialTranslationId?: string | null } & {
    initialBookId?: string | null;
    initialChapterNumber?: number | null;
  } = {}
) {
  const i18nManager = createI18nManager(createNavigationManager(), ["en"]);
  return createRawBibleReadingState(
    dataManager,
    createHighlightsManagerMock() as any,
    i18nManager,
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
  let logSpy: Mock;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
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
      highlightsManager as any,
      createI18nManager(createNavigationManager(), ["en"])
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
      highlightsManager as any,
      createI18nManager(createNavigationManager(), ["en"])
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
      highlightsManager as any,
      createI18nManager(createNavigationManager(), ["en"])
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
      highlightsManager as any,
      createI18nManager(createNavigationManager(), ["en"])
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
    vi.useRealTimers();
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    vi.useFakeTimers();
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
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("decorateVerses() auto-removes a decoration after removeAfterMs", async () => {
    vi.useRealTimers();
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    vi.useFakeTimers();
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

      vi.advanceTimersByTime(99);
      expect(state.decorations.value.some((d) => d.id === decorationId)).toBe(
        true
      );

      vi.advanceTimersByTime(1);
      expect(state.decorations.value.some((d) => d.id === decorationId)).toBe(
        false
      );
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/books.json")
    );
    expect(state.translationBooks.value).toEqual(aabBooks);
  });

  it("selectBook() loads the selected book", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectBook("EXO");

    expect(fetchMock).toHaveBeenCalledWith(
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

    expect(fetchMock).toHaveBeenCalledWith(
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

    expect(fetchMock).toHaveBeenCalledWith(
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
      highlightsManager as any,
      createI18nManager(createNavigationManager(), ["en"])
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

    expect(fetchMock).toHaveBeenCalledWith(
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

    expect(fetchMock).toHaveBeenCalledWith(
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
      ...makeChapter(aabBooks, "GEN", 1),
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/books.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/1.json"));
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/books.json"));
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/GEN/1.json"));
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/1.json"));
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/books.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/2.json"));
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/books.json"));
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/BSB/GEN/2.json"));
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/1.json"));
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

    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/available_translations.json")
    );
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/books.json"));
    expect(fetchMock).toHaveBeenCalledWith(makeAltUrl("/api/NIV/MAT/1.json"));
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

  describe("discoveredCrossReferences, discoveredContent, discoveredStudyNotes", () => {
    function createDiscoverManagerMock(
      responses: DiscoverProviderResults[][] = []
    ): DiscoverManager {
      let callIndex = 0;
      return {
        registerDiscoverProvider: vi.fn(),
        discover: vi.fn().mockImplementation(async function* () {
          const results = responses[callIndex++] ?? [];
          for (const result of results) {
            yield result;
          }
        }),
      };
    }

    const genBookData = aabBooks.books[0]!;

    it("all three signals are empty when no discoverManager is provided", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"])
      );
      await waitForInitialLoad(state);

      expect(state.discoveredCrossReferences.value).toEqual([]);
      expect(state.discoveredContent.value).toEqual([]);
      expect(state.discoveredStudyNotes.value).toEqual([]);
    });

    it("discoveredContent only contains 'content' results for the current chapter", async () => {
      const discoverManager = createDiscoverManagerMock([
        [
          {
            providerId: "p1",
            results: [
              {
                type: "content",
                title: "Note 1",
                description: "desc",
                reference: { book: "GEN", chapter: 1, verse: 1 },
                content: null as any,
              },
              {
                type: "content",
                title: "Note 2",
                description: "desc",
                reference: { book: "EXO", chapter: 1, verse: 1 },
                content: null as any,
              },
            ],
          },
        ],
      ]);

      setWebResponses(createReadingManagerResponseMap());
      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        discoverManager
      );
      await waitForInitialLoad(state);
      await waitFor(() => state.discoveredContent.value.length > 0);

      expect(state.discoveredContent.value).toEqual([
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Note 1",
              description: "desc",
              reference: {
                book: "GEN",
                chapter: 1,
                verse: 1,
                bookData: genBookData,
              },
              content: null,
            },
          ],
        },
      ]);
      expect(state.discoveredCrossReferences.value).toEqual([]);
      expect(state.discoveredStudyNotes.value).toEqual([]);
    });

    it("discoveredCrossReferences only contains 'cross-reference' results for the current chapter", async () => {
      const discoverManager = createDiscoverManagerMock([
        [
          {
            providerId: "p1",
            results: [
              {
                type: "cross-reference",
                reference: { book: "GEN", chapter: 1, verse: 3 },
                crossReference: { book: "GEN", chapter: 2, verse: 1 },
              },
              {
                type: "cross-reference",
                reference: { book: "EXO", chapter: 1, verse: 1 },
                crossReference: { book: "GEN", chapter: 1, verse: 1 },
              },
            ],
          },
        ],
      ]);

      setWebResponses(createReadingManagerResponseMap());
      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        discoverManager
      );
      await waitForInitialLoad(state);
      await waitFor(() => state.discoveredCrossReferences.value.length > 0);

      expect(state.discoveredCrossReferences.value).toEqual([
        {
          providerId: "p1",
          results: [
            {
              type: "cross-reference",
              reference: {
                book: "GEN",
                chapter: 1,
                verse: 3,
                bookData: genBookData,
              },
              crossReference: {
                book: "GEN",
                chapter: 2,
                verse: 1,
                bookData: genBookData,
              },
            },
          ],
        },
      ]);
      expect(state.discoveredContent.value).toEqual([]);
      expect(state.discoveredStudyNotes.value).toEqual([]);
    });

    it("discoveredStudyNotes only contains 'study-note' results for the current chapter", async () => {
      const discoverManager = createDiscoverManagerMock([
        [
          {
            providerId: "p1",
            results: [
              {
                type: "study-note",
                reference: { book: "GEN", chapter: 1, verse: 2 },
                content: null as any,
              },
              {
                type: "study-note",
                reference: { book: "MAT", chapter: 1, verse: 1 },
                content: null as any,
              },
            ],
          },
        ],
      ]);

      setWebResponses(createReadingManagerResponseMap());
      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        discoverManager
      );
      await waitForInitialLoad(state);
      await waitFor(() => state.discoveredStudyNotes.value.length > 0);

      expect(state.discoveredStudyNotes.value).toEqual([
        {
          providerId: "p1",
          results: [
            {
              type: "study-note",
              reference: {
                book: "GEN",
                chapter: 1,
                verse: 2,
                bookData: genBookData,
              },
              content: null,
            },
          ],
        },
      ]);
      expect(state.discoveredCrossReferences.value).toEqual([]);
      expect(state.discoveredContent.value).toEqual([]);
    });

    it("mixed results from a single provider are split into separate signals", async () => {
      const discoverManager = createDiscoverManagerMock([
        [
          {
            providerId: "p1",
            results: [
              {
                type: "cross-reference",
                reference: { book: "GEN", chapter: 1, verse: 1 },
                crossReference: { book: "GEN", chapter: 2, verse: 1 },
              },
              {
                type: "content",
                title: "A Title",
                description: "desc",
                reference: { book: "GEN", chapter: 1, verse: 1 },
                content: null as any,
              },
              {
                type: "study-note",
                reference: { book: "GEN", chapter: 1, verse: 1 },
                content: null as any,
              },
            ],
          },
        ],
      ]);

      setWebResponses(createReadingManagerResponseMap());
      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        discoverManager
      );
      await waitForInitialLoad(state);
      await waitFor(
        () =>
          state.discoveredCrossReferences.value.length > 0 &&
          state.discoveredContent.value.length > 0 &&
          state.discoveredStudyNotes.value.length > 0
      );

      expect(state.discoveredCrossReferences.value[0]!.results).toHaveLength(1);
      expect(state.discoveredCrossReferences.value[0]!.results[0]!.type).toBe(
        "cross-reference"
      );
      expect(state.discoveredContent.value[0]!.results).toHaveLength(1);
      expect(state.discoveredContent.value[0]!.results[0]!.type).toBe(
        "content"
      );
      expect(state.discoveredStudyNotes.value[0]!.results).toHaveLength(1);
      expect(state.discoveredStudyNotes.value[0]!.results[0]!.type).toBe(
        "study-note"
      );
    });

    it("results from multiple providers are grouped by providerId", async () => {
      const discoverManager = createDiscoverManagerMock([
        [
          {
            providerId: "providerA",
            results: [
              {
                type: "content",
                title: "From A",
                description: "desc",
                reference: { book: "GEN", chapter: 1, verse: 1 },
                content: null as any,
              },
            ],
          },
          {
            providerId: "providerB",
            results: [
              {
                type: "content",
                title: "From B",
                description: "desc",
                reference: { book: "GEN", chapter: 1, verse: 2 },
                content: null as any,
              },
            ],
          },
        ],
      ]);

      setWebResponses(createReadingManagerResponseMap());
      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        discoverManager
      );
      await waitForInitialLoad(state);
      await waitFor(() => state.discoveredContent.value.length === 2);

      const providerIds = state.discoveredContent.value.map(
        (r) => r.providerId
      );
      expect(providerIds).toContain("providerA");
      expect(providerIds).toContain("providerB");
    });

    it("signals reset when chapter changes", async () => {
      const responses = createReadingManagerResponseMap();
      const discoverManager = createDiscoverManagerMock([
        [
          {
            providerId: "p1",
            results: [
              {
                type: "study-note",
                reference: { book: "GEN", chapter: 1, verse: 1 },
                content: null as any,
              },
            ],
          },
        ],
        [],
      ]);

      setWebResponses(responses);
      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        discoverManager
      );
      await waitForInitialLoad(state);
      await waitFor(() => state.discoveredStudyNotes.value.length > 0);

      expect(state.discoveredStudyNotes.value).toHaveLength(1);

      await state.selectChapter("GEN", 2);
      await waitFor(() => state.chapterNumber.value === 2);

      expect(state.discoveredStudyNotes.value).toEqual([]);
      expect(state.discoveredCrossReferences.value).toEqual([]);
      expect(state.discoveredContent.value).toEqual([]);
    });
  });

  describe("reading extensions", () => {
    const genBookData = aabBooks.books.find((book) => book.id === "GEN")!;

    function createContentDiscoverManager(): DiscoverManager {
      return {
        registerDiscoverProvider: vi.fn(),
        discover: vi.fn().mockImplementation(async function* () {
          yield {
            providerId: "p1",
            results: [
              {
                type: "content",
                title: "Base note",
                description: "desc",
                reference: { book: "GEN", chapter: 1, verse: 1 },
                content: null as any,
              },
            ],
          } satisfies DiscoverProviderResults;
        }),
      };
    }

    function createStateWithExtensions(
      readingExtensionManager: ReturnType<
        typeof createBibleReadingExtensionManager
      >,
      discoverManager?: DiscoverManager
    ) {
      return createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        discoverManager,
        readingExtensionManager
      );
    }

    it("enableExtension activates the extension and passes context", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      const activate = vi.fn().mockReturnValue({});
      manager.registerReadingExtension({ id: "x", activate });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);

      expect(state.isExtensionEnabled("x")).toBe(false);
      state.enableExtension("x", { count: 1 });

      expect(state.isExtensionEnabled("x")).toBe(true);
      expect(activate).toHaveBeenCalledTimes(1);
      const ctx = activate.mock.calls[0]![0]!;
      expect(ctx.readingState).toBe(state);
      expect(ctx.data.value).toEqual({ count: 1 });
      expect(state.enabledExtensions.value.map((r) => r.id)).toEqual(["x"]);
    });

    it("disableExtension runs the instance dispose and removes it", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      const dispose = vi.fn();
      manager.registerReadingExtension({
        id: "x",
        activate: () => ({ dispose }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);

      state.enableExtension("x");
      state.disableExtension("x");

      expect(dispose).toHaveBeenCalledTimes(1);
      expect(state.isExtensionEnabled("x")).toBe(false);
      expect(state.enabledExtensions.value).toEqual([]);
    });

    it("re-enabling an already-enabled extension updates its data without re-activating", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      const activate = vi.fn().mockReturnValue({});
      manager.registerReadingExtension({ id: "x", activate });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);

      state.enableExtension("x", { count: 1 });
      const dataSignal = activate.mock.calls[0]![0]!.data;
      state.enableExtension("x", { count: 2 });

      expect(activate).toHaveBeenCalledTimes(1);
      expect(dataSignal.value).toEqual({ count: 2 });
    });

    it("enabling an unregistered extension is a no-op", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const warnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      const manager = createBibleReadingExtensionManager();

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);

      state.enableExtension("missing");

      expect(state.isExtensionEnabled("missing")).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("navigateNext returning 'prevent' blocks normal navigation", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          navigateNext: () => ({ type: "prevent" }),
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");

      await state.loadNextChapter();

      expect(state.chapterNumber.value).toBe(1);
    });

    it("navigateNext returning 'handled' blocks normal navigation", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      const navigateNext = vi.fn().mockReturnValue({ type: "handled" });
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({ navigateNext }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");

      await state.loadNextChapter();

      expect(navigateNext).toHaveBeenCalledTimes(1);
      expect(state.chapterNumber.value).toBe(1);
    });

    it("navigateNext returning 'navigate' goes to the chosen chapter", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const targetChapter = makeChapter(aabBooks, "GEN", 3);
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          navigateNext: () => ({ type: "navigate", chapter: targetChapter }),
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");

      await state.loadNextChapter();

      expect(state.chapterNumber.value).toBe(3);
    });

    it("resolves navigation hooks by priority (higher first wins)", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const chapterThree = makeChapter(aabBooks, "GEN", 3);
      const chapterFive = makeChapter(aabBooks, "GEN", 5);
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "low",
        priority: 1,
        activate: (): ReadingExtensionInstance => ({
          navigateNext: () => ({ type: "navigate", chapter: chapterFive }),
        }),
      });
      manager.registerReadingExtension({
        id: "high",
        priority: 100,
        activate: (): ReadingExtensionInstance => ({
          navigateNext: () => ({ type: "navigate", chapter: chapterThree }),
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("low");
      state.enableExtension("high");

      await state.loadNextChapter();

      expect(state.chapterNumber.value).toBe(3);
    });

    it("transformDiscoveredContent can add content", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          transformDiscoveredContent: ({ results }) => [
            ...results,
            {
              providerId: "ext",
              results: [
                {
                  type: "content",
                  title: "Injected",
                  description: "from extension",
                  reference: {
                    book: "GEN",
                    chapter: 1,
                    verse: 1,
                    bookData: genBookData,
                  },
                  content: null as any,
                },
              ],
            },
          ],
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);

      expect(state.discoveredContent.value).toEqual([]);
      state.enableExtension("x");

      expect(state.discoveredContent.value).toEqual([
        {
          providerId: "ext",
          results: [
            expect.objectContaining({ type: "content", title: "Injected" }),
          ],
        },
      ]);
    });

    it("transformDiscoveredContent can suppress content by returning []", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          transformDiscoveredContent: () => [],
        }),
      });

      const state = createStateWithExtensions(
        manager,
        createContentDiscoverManager()
      );
      await waitForInitialLoad(state);
      await waitFor(() => state.discoveredContent.value.length > 0);

      state.enableExtension("x");

      expect(state.discoveredContent.value).toEqual([]);
    });

    it("dispose() disables all enabled extensions", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      const disposeA = vi.fn();
      const disposeB = vi.fn();
      manager.registerReadingExtension({
        id: "a",
        activate: () => ({ dispose: disposeA }),
      });
      manager.registerReadingExtension({
        id: "b",
        activate: () => ({ dispose: disposeB }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("a");
      state.enableExtension("b");

      state.dispose();

      expect(disposeA).toHaveBeenCalledTimes(1);
      expect(disposeB).toHaveBeenCalledTimes(1);
      expect(state.enabledExtensions.value).toEqual([]);
    });
  });
});
