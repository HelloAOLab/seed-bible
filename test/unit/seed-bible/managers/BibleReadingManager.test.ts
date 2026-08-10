import {
  createBibleReadingState as createRawBibleReadingState,
  nextPosition,
  positionKey,
  positionsEqual,
  previousPosition,
  resolveChapterInBook,
  NAVIGATION_COALESCE_MS,
  type BibleReadingState,
  type VerseDecoration,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  FreeUseBibleAPI,
  type ChapterVerse,
  type TranslationBooks,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  EXAMPLE_API_ENDPOINT,
  ALT_API_ENDPOINT,
  altTranslations,
  bsbBooks,
  createControlledFetch,
  createReadingManagerResponseMap,
  createResponse,
  makeChapter,
  makeAltUrl,
  makeExampleUrl,
  nivBooks,
  translations,
  type WebResponseMap,
  aabBooks,
  edgeCaseBooks,
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
    scrollToVerse?: number;
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

describe("reading position helpers", () => {
  const at = (bookId: string, chapterNumber: number) => ({
    translationId: "EDGE",
    bookId,
    chapterNumber,
  });

  describe("nextPosition", () => {
    it("advances within a book", () => {
      expect(nextPosition(edgeCaseBooks, at("PSA", 5))).toEqual(at("PSA", 6));
    });

    it("crosses a gap in book order, ignoring the array's own ordering", () => {
      // GEN is order 1 and PSA is order 19, with nothing in between, and the
      // fixture lists them as [TOB, GEN, PSA] — so indexing the array would
      // land on TOB instead.
      expect(nextPosition(edgeCaseBooks, at("GEN", 2))).toEqual(at("PSA", 3));
    });

    it("lands on the next book's first chapter even when that is not 1", () => {
      expect(nextPosition(edgeCaseBooks, at("GEN", 2))?.chapterNumber).toBe(3);
    });

    it("advances into apocryphal books", () => {
      expect(nextPosition(edgeCaseBooks, at("PSA", 7))).toEqual(at("TOB", 1));
    });

    it("returns null at the last chapter of the last book", () => {
      expect(nextPosition(edgeCaseBooks, at("TOB", 3))).toBeNull();
    });

    it("returns null for a book that is not in the catalog", () => {
      expect(nextPosition(edgeCaseBooks, at("ZZZ", 1))).toBeNull();
    });

    it("crosses the book gap in the standard fixture", () => {
      const position = {
        translationId: "AAB",
        bookId: "EXO",
        chapterNumber: 40,
      };
      expect(nextPosition(aabBooks, position)).toEqual({
        translationId: "AAB",
        bookId: "MAT",
        chapterNumber: 1,
      });
    });
  });

  describe("previousPosition", () => {
    it("steps back within a book", () => {
      expect(previousPosition(edgeCaseBooks, at("PSA", 6))).toEqual(
        at("PSA", 5)
      );
    });

    it("crosses back to the previous book's last chapter", () => {
      expect(previousPosition(edgeCaseBooks, at("TOB", 1))).toEqual(
        at("PSA", 7)
      );
    });

    it("stops at a book's own first chapter rather than assuming 1", () => {
      expect(previousPosition(edgeCaseBooks, at("PSA", 3))).toEqual(
        at("GEN", 2)
      );
    });

    it("returns null at the first chapter of the first book", () => {
      expect(previousPosition(edgeCaseBooks, at("GEN", 1))).toBeNull();
    });
  });

  describe("resolveChapterInBook", () => {
    const psalms = edgeCaseBooks.books.find((book) => book.id === "PSA")!;

    it("keeps a chapter that falls inside the book", () => {
      expect(resolveChapterInBook(psalms, 5)).toBe(5);
    });

    it("accepts the book's own boundaries", () => {
      expect(resolveChapterInBook(psalms, 3)).toBe(3);
      expect(resolveChapterInBook(psalms, 7)).toBe(7);
    });

    it("falls back to the book's first chapter when out of range", () => {
      // Not a clamp: an over-large request goes to the *first* chapter, which
      // is the behaviour this replaced.
      expect(resolveChapterInBook(psalms, 2)).toBe(3);
      expect(resolveChapterInBook(psalms, 99999)).toBe(3);
    });
  });

  describe("positionKey / positionsEqual", () => {
    it("treats identical positions as equal", () => {
      expect(positionsEqual(at("GEN", 1), at("GEN", 1))).toBe(true);
      expect(positionKey(at("GEN", 1))).toBe(positionKey(at("GEN", 1)));
    });

    it("distinguishes positions that differ in any field", () => {
      expect(positionsEqual(at("GEN", 1), at("GEN", 2))).toBe(false);
      expect(positionsEqual(at("GEN", 1), at("PSA", 1))).toBe(false);
      expect(positionKey(at("GEN", 1))).not.toBe(positionKey(at("GEN", 2)));
    });

    it("handles nulls", () => {
      expect(positionsEqual(null, null)).toBe(true);
      expect(positionsEqual(at("GEN", 1), null)).toBe(false);
    });
  });
});

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

  it("does not silently substitute a different book when the requested book isn't in the translation's book list", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager(), {
      initialBookId: "NOTABOOK",
      initialChapterNumber: 1,
    });
    await waitForInitialLoad(state);

    // Left exactly as requested — not silently corrected to GEN (the
    // translation's first book) — so the UI can detect "book not found"
    // instead of showing substitute content at the wrong URL.
    expect(state.bookId.value).toBe("NOTABOOK");
    expect(state.chapterNumber.value).toBe(1);
    expect(state.error.value).toBeNull();
    expect(state.translationBooks.value).not.toBeNull();
    expect(state.chapterData.value).toBeNull();
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
      makeExampleUrl("/api/AAB/books.json"),
      expect.anything()
    );
    expect(state.translationBooks.value).toEqual(aabBooks);
  });

  it("derives hasNext/hasPrevious from the book catalog, not the loaded chapter", async () => {
    setWebResponses({
      ...createReadingManagerResponseMap(),
      [makeExampleUrl("/api/AAB/MAT/28.json")]: createResponse(
        makeChapter(aabBooks, "MAT", 28)
      ),
    });
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    expect(state.bookId.value).toBe("GEN");
    expect(state.chapterNumber.value).toBe(1);
    expect(state.hasPrevious.value).toBe(false);
    expect(state.hasNext.value).toBe(true);

    await state.selectChapter("MAT", 28);

    // Matthew is the last book in this catalog, so there is nothing after
    // chapter 28 — even though the chapter payload still carries a
    // `nextChapterApiLink`, which is what used to be consulted here.
    expect(state.chapterData.value?.nextChapterApiLink).toBeTruthy();
    expect(state.hasNext.value).toBe(false);
    expect(state.hasPrevious.value).toBe(true);
  });

  it("falls back to the chapter's links while a translation's catalog is missing", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);
    expect(state.hasNext.value).toBe(true);

    // Point at a translation whose catalog has not been downloaded. There is
    // nothing to derive adjacency from, so the loaded chapter's links stand in
    // rather than reporting "no next chapter" and disabling the controls.
    state.translationId.value = "NIV";

    expect(state.translationBooks.value).toBeNull();
    expect(state.chapterData.value?.nextChapterApiLink).toBeTruthy();
    expect(state.hasNext.value).toBe(true);
  });

  it("tracks the catalog of whichever translation is selected", async () => {
    setWebResponses({
      ...createReadingManagerResponseMap(),
      [makeExampleUrl("/api/NIV/books.json")]: createResponse(nivBooks),
    });
    const dataManager = createDataManager();
    const state = createBibleReadingState(dataManager);
    await waitForInitialLoad(state);
    expect(state.translationBooks.value).toEqual(aabBooks);

    await dataManager.getTranslationBooks("NIV");
    state.translationId.value = "NIV";

    // The catalog is derived rather than stored, so it swaps with the
    // translation id instead of lagging behind it until a chapter loads.
    expect(state.translationBooks.value).toEqual(nivBooks);
  });

  it("selectBook() loads the selected book", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectBook("EXO");

    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/EXO/1.json"),
      expect.anything()
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
      makeExampleUrl("/api/AAB/GEN/5.json"),
      expect.anything()
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
      makeExampleUrl("/api/AAB/GEN/5.json"),
      expect.anything()
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

  it("publishes a deep-linked verse on the initial load", async () => {
    // A `?verse=` deep link asks for the scroll before anything is fetched. The
    // chapter request needs one round trip while the initial load needs two
    // (translations, then the book catalog), so the text reliably arrives first
    // — the scroll target has to already be recorded by then or it is dropped
    // and never republished, since the position never changes again.
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager(), {
      initialTranslationId: "AAB",
      initialBookId: "GEN",
      initialChapterNumber: 5,
      scrollToVerse: 3,
    });
    await waitForInitialLoad(state);

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
      makeExampleUrl("/api/AAB/GEN/2.json"),
      expect.anything()
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
      makeExampleUrl("/api/AAB/GEN/1.json"),
      expect.anything()
    );
    expect(state.chapterNumber.value).toBe(1);
    expect(state.chapterData.value?.chapter.number).toBe(1);
  });

  it("advances loadNextChapter() three times without waiting on each fetch, landing on chapter 4 regardless of fetch resolution order", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/3.json")] = createResponse(
      makeChapter(aabBooks, "GEN", 3)
    );
    responses[makeExampleUrl("/api/AAB/GEN/4.json")] = createResponse(
      makeChapter(aabBooks, "GEN", 4)
    );
    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const gen2Url = makeExampleUrl("/api/AAB/GEN/2.json");
    const gen3Url = makeExampleUrl("/api/AAB/GEN/3.json");
    const gen4Url = makeExampleUrl("/api/AAB/GEN/4.json");

    const resolvers = new Map<string, () => void>();
    fetchMock.mockImplementation((url: string) => {
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      if (url === gen2Url || url === gen3Url || url === gen4Url) {
        return new Promise((resolve) => {
          resolvers.set(url, () => resolve(response));
        });
      }
      return Promise.resolve(response);
    });

    // Simulate tapping "next" three times in quick succession, before the
    // first fetch has even been issued. None of these calls wait on each
    // other's network round-trip: each target is computed purely from
    // already-loaded book metadata, so all three fetches get issued right
    // away rather than one at a time.
    const first = state.loadNextChapter();
    const second = state.loadNextChapter();
    const third = state.loadNextChapter();

    await waitFor(
      () =>
        resolvers.has(gen2Url) &&
        resolvers.has(gen3Url) &&
        resolvers.has(gen4Url)
    );

    expect(fetchMock).toHaveBeenCalledWith(gen2Url, expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(gen3Url, expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(gen4Url, expect.anything());

    // Resolve out of call order — the last-issued target (GEN/4) resolves
    // first, the earlier, now-superseded targets resolve last — and the
    // final state should still land on GEN/4, proving the result is driven
    // by which call was issued last, not which fetch resolved first.
    resolvers.get(gen4Url)!();
    resolvers.get(gen2Url)!();
    resolvers.get(gen3Url)!();

    await Promise.all([first, second, third]);

    expect(state.chapterNumber.value).toBe(4);
    expect(state.chapterData.value?.chapter.number).toBe(4);
    expect(state.loading.value).toBe(false);
  });

  it("a loadPreviousChapter() call issued right after loadNextChapter() wins, since it was issued last", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/GEN/3.json")] = createResponse(
      makeChapter(aabBooks, "GEN", 3)
    );
    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);
    await state.selectChapter("GEN", 2);

    const next = state.loadNextChapter();
    const previous = state.loadPreviousChapter();

    await Promise.all([next, previous]);

    // next() computes GEN 3 from the GEN 2 baseline; previous(), issued
    // immediately after, chains off next()'s already-registered target
    // (GEN 3) and computes GEN 2 — then supersedes next()'s still-in-flight
    // fetch, landing on GEN 2, not by racing both off the same GEN 2
    // snapshot.
    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/GEN/3.json"),
      expect.anything()
    );
    expect(state.chapterNumber.value).toBe(2);
    expect(state.chapterData.value?.chapter.number).toBe(2);
  });

  it("lets a pending translation switch win over taps issued while its catalog is still loading", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/NIV/books.json")] = createResponse(nivBooks);
    responses[makeExampleUrl("/api/NIV/MAT/1.json")] = createResponse({
      ...makeChapter(nivBooks, "MAT", 1),
      translation: nivTranslation,
      book: nivBooks.books[0]!,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    });
    responses[makeExampleUrl("/api/NIV/MAT/2.json")] = createResponse(
      makeChapter(nivBooks, "MAT", 2)
    );
    responses[makeExampleUrl("/api/NIV/MAT/3.json")] = createResponse(
      makeChapter(nivBooks, "MAT", 3)
    );
    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const booksUrl = makeExampleUrl("/api/NIV/books.json");
    let resolveBooks: (() => void) | undefined;
    fetchMock.mockImplementation((url: string) => {
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      if (url === booksUrl) {
        return new Promise((resolve) => {
          resolveBooks = () => resolve(response);
        });
      }
      return Promise.resolve(response);
    });

    const translationCall = state.selectTranslation("NIV");
    const next1 = state.loadNextChapter();
    const next2 = state.loadNextChapter();

    await waitFor(() => resolveBooks !== undefined);
    resolveBooks!();

    await Promise.all([translationCall, next1, next2]);

    // The two taps act on the translation still on screen (they advance AAB
    // Genesis immediately, which is the whole point of not waiting on a
    // request), and the translation switch then lands on top of them. So the
    // reader ends where they asked to go last: NIV's first book and chapter.
    //
    // Deliberately not chained behind the pending switch. Chaining is how the
    // earlier attempt at #1414 got MAT 3 here, but it costs the instant
    // position write that this whole change exists to deliver, and picking a
    // translation from a menu is not the rapid-fire path. What matters is that
    // the end state is coherent rather than a mixture of the two.
    expect(state.translationId.value).toBe("NIV");
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(1);
    expect(state.isChapterContentStale.value).toBe(false);
    expect(state.error.value).toBeNull();
  });

  it("crosses a book boundary using the next book's own firstChapterNumber, not a hardcoded 1", async () => {
    const customBooks: TranslationBooks = {
      translation: aabBooks.translation,
      books: [
        { ...aabBooks.books[0]!, numberOfChapters: 2 },
        {
          id: "WEIRD",
          name: "Weird Book",
          commonName: "Weird Book",
          title: null,
          order: 2,
          numberOfChapters: 3,
          firstChapterNumber: 100,
          firstChapterApiLink: "/api/AAB/WEIRD/100.json",
          lastChapterNumber: 102,
          lastChapterApiLink: "/api/AAB/WEIRD/102.json",
          totalNumberOfVerses: 30,
        },
      ],
    };

    const responses: WebResponseMap = {
      [makeExampleUrl("/api/available_translations.json")]:
        createResponse(translations),
      [makeExampleUrl("/api/AAB/books.json")]: createResponse(customBooks),
      [makeExampleUrl("/api/AAB/GEN/1.json")]: createResponse(
        makeChapter(customBooks, "GEN", 1)
      ),
      [makeExampleUrl("/api/AAB/GEN/2.json")]: createResponse(
        makeChapter(customBooks, "GEN", 2)
      ),
      [makeExampleUrl("/api/AAB/WEIRD/100.json")]: createResponse(
        makeChapter(customBooks, "WEIRD", 100)
      ),
    };

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);
    await state.selectChapter("GEN", 2); // last chapter of GEN under this fixture

    await state.loadNextChapter();

    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/AAB/WEIRD/100.json"),
      expect.anything()
    );
    expect(state.bookId.value).toBe("WEIRD");
    expect(state.chapterNumber.value).toBe(100);
  });

  it("no-ops when tapping next at the last chapter of the last book", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/MAT/28.json")] = createResponse(
      makeChapter(aabBooks, "MAT", 28)
    );
    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);
    await state.selectChapter("MAT", 28); // last book (order 40), last chapter

    fetchMock.mockClear();
    await state.loadNextChapter();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.bookId.value).toBe("MAT");
    expect(state.chapterNumber.value).toBe(28);
  });

  it("no-ops when tapping previous at the first chapter of the first book", async () => {
    setWebResponses(createReadingManagerResponseMap());
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state); // starts at GEN 1 by default

    fetchMock.mockClear();
    await state.loadPreviousChapter();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.bookId.value).toBe("GEN");
    expect(state.chapterNumber.value).toBe(1);
  });

  it("supersedes an in-flight selectBook() call when loadNextChapter() is issued immediately after", async () => {
    const responses = createReadingManagerResponseMap();
    responses[makeExampleUrl("/api/AAB/EXO/1.json")] = createResponse(
      makeChapter(aabBooks, "EXO", 1)
    );
    responses[makeExampleUrl("/api/AAB/EXO/2.json")] = createResponse(
      makeChapter(aabBooks, "EXO", 2)
    );
    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    const selectBookCall = state.selectBook("EXO");
    const nextCall = state.loadNextChapter();

    await Promise.all([selectBookCall, nextCall]);

    // loadNextChapter(), issued immediately after selectBook(), builds on
    // selectBook's already-registered target (EXO 1) and supersedes it,
    // landing on EXO 2 rather than either call racing independently.
    expect(state.bookId.value).toBe("EXO");
    expect(state.chapterNumber.value).toBe(2);
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
      makeExampleUrl("/api/NIV/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/MAT/1.json"),
      expect.anything()
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
      makeAltUrl("/api/available_translations.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/MAT/1.json"),
      expect.anything()
    );
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
      makeAltUrl("/api/available_translations.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/BSB/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/BSB/GEN/1.json"),
      expect.anything()
    );
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
      makeAltUrl("/api/available_translations.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/MAT/1.json"),
      expect.anything()
    );
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
      makeExampleUrl("/api/NIV/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeExampleUrl("/api/NIV/MAT/3.json"),
      expect.anything()
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
      makeAltUrl("/api/available_translations.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/MAT/2.json"),
      expect.anything()
    );
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
      makeAltUrl("/api/available_translations.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/BSB/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/BSB/GEN/2.json"),
      expect.anything()
    );
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
      makeAltUrl("/api/available_translations.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/MAT/1.json"),
      expect.anything()
    );
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
      makeAltUrl("/api/available_translations.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/books.json"),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      makeAltUrl("/api/NIV/MAT/1.json"),
      expect.anything()
    );
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

  describe("navigation is not blocked by in-flight chapter text (#1414)", () => {
    /** Holds every Genesis chapter except the first, which the initial load needs. */
    const holdLaterGenesisChapters = (url: string) =>
      /\/api\/AAB\/GEN\/(?!1\.json)\d+\.json$/.test(url);

    function chapterUrl(chapter: number): string {
      return makeExampleUrl(`/api/AAB/GEN/${chapter}.json`);
    }

    function responsesThroughChapter(last: number): WebResponseMap {
      const responses = createReadingManagerResponseMap();
      for (let chapter = 2; chapter <= last; chapter++) {
        responses[chapterUrl(chapter)] = createResponse(
          makeChapter(aabBooks, "GEN", chapter)
        );
      }
      return responses;
    }

    async function createStateWithHeldChapters(last = 6) {
      const controlled = createControlledFetch(
        responsesThroughChapter(last),
        holdLaterGenesisChapters
      );
      fetchMock.mockImplementation(controlled.fetch);
      const dataManager = createDataManager();
      const state = createBibleReadingState(dataManager);
      await waitForInitialLoad(state);
      return { state, controlled, dataManager };
    }

    it("advances one chapter per press while the text is still downloading", async () => {
      const { state } = await createStateWithHeldChapters();
      expect(state.chapterNumber.value).toBe(1);

      // Three presses back to back, nothing awaited in between — the same thing
      // a reader does by tapping quickly.
      void state.loadNextChapter();
      void state.loadNextChapter();
      void state.loadNextChapter();

      // Position has moved three chapters, synchronously, before any request
      // has come back.
      expect(state.chapterNumber.value).toBe(4);
      expect(state.title.value).toBe("Genesis 4");
      expect(state.shortTitle.value).toBe("GEN 4");

      // ...and the text on screen is still chapter 1, which is what the
      // skeleton placeholder keys off.
      expect(state.chapterData.value?.chapter.number).toBe(1);
      expect(state.isChapterContentStale.value).toBe(true);
    });

    it("cancels the chapters skimmed past and commits only the one landed on", async () => {
      const { state, controlled } = await createStateWithHeldChapters();

      const committed: number[] = [];
      const stop = effect(() => {
        const chapter = state.chapterData.value;
        if (chapter) {
          committed.push(chapter.chapter.number);
        }
      });

      void state.loadNextChapter();
      void state.loadNextChapter();
      void state.loadNextChapter();
      expect(state.chapterNumber.value).toBe(4);

      // Each press supersedes the request before it, so the reader is never
      // waiting behind downloads for chapters they have already passed — the
      // whole point on a slow connection. Only chapter 4 is still in flight.
      expect(controlled.aborted()).toEqual([chapterUrl(2), chapterUrl(3)]);
      expect(controlled.pending()).toEqual([chapterUrl(4)]);

      controlled.settle(chapterUrl(4));
      await waitFor(() => state.chapterData.value?.chapter.number === 4);

      expect(state.chapterNumber.value).toBe(4);
      expect(state.isChapterContentStale.value).toBe(false);
      // Cancelling is not what keeps the skimmed chapters off screen — the
      // generation guard does that, and it still has to hold on its own. Proven
      // separately below, where a second caller keeps a superseded request
      // alive so it can land late.
      expect(state.error.value).toBeNull();

      stop();
      expect(committed).toEqual([1, 4]);
    });

    it("serves an already-downloaded chapter from cache after an unrelated cancellation", async () => {
      // The response cache doubles as the in-flight de-duplicator, so it would
      // be easy for cancellation to evict a *completed* chapter along with the
      // cancelled one. If that happened, pressing back to a chapter you have
      // already read would re-download it — the opposite of the point.
      const { state, controlled } = await createStateWithHeldChapters();

      // Download chapter 2 fully, then move on to 3 so that chapter 2 is no
      // longer what's on screen — otherwise coming back to it needs no request
      // at all and the cache is never consulted.
      void state.loadNextChapter();
      controlled.settle(chapterUrl(2));
      await waitFor(() => state.chapterData.value?.chapter.number === 2);
      void state.loadNextChapter();
      controlled.settle(chapterUrl(3));
      await waitFor(() => state.chapterData.value?.chapter.number === 3);

      // Skim forward and abandon chapter 4 mid-flight.
      void state.loadNextChapter();
      void state.loadNextChapter();
      expect(state.chapterNumber.value).toBe(5);
      expect(controlled.aborted()).toContain(chapterUrl(4));

      const requestsBefore = fetchMock.mock.calls.length;

      // Back to chapter 2, which is already downloaded.
      void state.loadPreviousChapter();
      void state.loadPreviousChapter();
      void state.loadPreviousChapter();
      await waitFor(() => state.chapterData.value?.chapter.number === 2);

      expect(state.chapterNumber.value).toBe(2);
      expect(state.isChapterContentStale.value).toBe(false);
      // Served from cache: chapter 2 was never requested a second time, even
      // though an unrelated request was cancelled in between.
      expect(
        fetchMock.mock.calls
          .slice(requestsBefore)
          .map((call) => call[0] as string)
      ).not.toContain(chapterUrl(2));
    });

    it("still refuses a superseded chapter that cancellation could not stop", async () => {
      // A request shared with another caller — the mobile adjacent-chapter
      // prefetch does exactly this — cannot be cancelled out from under them,
      // so it really can arrive after the reader has moved on. The generation
      // guard, not cancellation, is what keeps it off screen.
      const { state, controlled, dataManager } =
        await createStateWithHeldChapters();

      const committed: number[] = [];
      const stop = effect(() => {
        const chapter = state.chapterData.value;
        if (chapter) {
          committed.push(chapter.chapter.number);
        }
      });

      void state.loadNextChapter();
      // A second, uncancellable subscriber to chapter 2's request.
      const prefetch = dataManager.getTranslationBookChapter("AAB", "GEN", 2);
      void state.loadNextChapter();

      // Chapter 2 survived the supersede because the other caller still wants
      // it, so it is genuinely able to land late.
      expect(controlled.aborted()).toEqual([]);
      expect(state.chapterNumber.value).toBe(3);

      controlled.settle(chapterUrl(3));
      await waitFor(() => state.chapterData.value?.chapter.number === 3);
      controlled.settle(chapterUrl(2));
      await expect(prefetch).resolves.toBeDefined();

      stop();
      expect(state.chapterNumber.value).toBe(3);
      expect(committed).toEqual([1, 3]);
    });

    it("resolves a superseded navigation instead of leaving the caller hanging", async () => {
      const { state, controlled } = await createStateWithHeldChapters();

      const first = state.loadNextChapter();
      void state.loadNextChapter();

      // The first call's chapter is never going to be displayed, but callers
      // await these methods and must not be stranded.
      await expect(first).resolves.toBeUndefined();

      controlled.settleAll();
      await waitFor(() => state.chapterData.value?.chapter.number === 3);
    });

    it("reverses direction mid-flight without waiting", async () => {
      const { state, controlled } = await createStateWithHeldChapters();

      void state.loadNextChapter();
      void state.loadNextChapter();
      void state.loadNextChapter();
      void state.loadPreviousChapter();

      expect(state.chapterNumber.value).toBe(3);

      controlled.settleAll();
      await waitFor(() => state.chapterData.value?.chapter.number === 3);
      expect(state.isChapterContentStale.value).toBe(false);
    });

    it("does not move past the end of the canon", async () => {
      setWebResponses({
        ...createReadingManagerResponseMap(),
        [makeExampleUrl("/api/AAB/MAT/28.json")]: createResponse(
          makeChapter(aabBooks, "MAT", 28)
        ),
      });
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);
      await state.selectChapter("MAT", 28);

      const callsBefore = fetchMock.mock.calls.length;
      void state.loadNextChapter();
      void state.loadNextChapter();

      expect(state.bookId.value).toBe("MAT");
      expect(state.chapterNumber.value).toBe(28);
      expect(fetchMock.mock.calls.length).toBe(callsBefore);
    });

    it("keeps a pending scroll target from landing on the wrong chapter", async () => {
      const { state, controlled } = await createStateWithHeldChapters();

      // Ask for a verse in chapter 2. The position lands but the text is held,
      // so the scroll target is still pending.
      void state.selectTranslationAndChapter("AAB", "GEN", 2, {
        scrollToVerse: 2,
      });
      await waitFor(() => state.chapterNumber.value === 2);
      expect(state.scrollToVerse.value).toBeNull();

      // Moving on before that text arrives must drop the request rather than
      // applying it to whichever chapter shows up next.
      void state.loadNextChapter();
      expect(state.chapterNumber.value).toBe(3);

      controlled.settleAll();
      await waitFor(() => state.chapterData.value?.chapter.number === 3);
      expect(state.scrollToVerse.value).toBeNull();
    });

    describe("recovering from a failed chapter load", () => {
      /**
       * Resolves to "hung" instead of waiting forever, so a navigation promise
       * that never settles fails the test rather than timing the suite out.
       */
      async function outcomeOf(
        promise: Promise<unknown>,
        timeoutMs = 500
      ): Promise<"settled" | "hung"> {
        return Promise.race([
          promise.then(() => "settled" as const),
          new Promise<"hung">((resolve) =>
            setTimeout(() => resolve("hung"), timeoutMs)
          ),
        ]);
      }

      function failingChapterResponses(chapter: number): WebResponseMap {
        const responses = responsesThroughChapter(3);
        responses[chapterUrl(chapter)] = createResponse(
          { error: true },
          500,
          "Server Error"
        );
        return responses;
      }

      it("re-requests a position that is already current when its last load failed", async () => {
        // Picking the same chapter again is the reader's only way to retry, and
        // it writes no new position — so without an explicit nudge the loader
        // never hears about it. A shared session hits the same path when a peer
        // re-broadcasts the position that just failed locally.
        const responses = failingChapterResponses(3);
        setWebResponses(responses);
        const state = createBibleReadingState(createDataManager());
        await waitForInitialLoad(state);

        await state.selectChapter("GEN", 3);
        expect(state.error.value).toContain("Status: 500");
        expect(state.chapterData.value?.chapter.number).toBe(1);
        expect(state.chapterNumber.value).toBe(3);

        // The endpoint recovers.
        responses[chapterUrl(3)] = createResponse(
          makeChapter(aabBooks, "GEN", 3)
        );
        const requestsBefore = fetchMock.mock.calls.length;

        expect(await outcomeOf(state.selectChapter("GEN", 3))).toBe("settled");

        expect(
          fetchMock.mock.calls
            .slice(requestsBefore)
            .map((call) => call[0] as string)
        ).toContain(chapterUrl(3));
        expect(state.chapterData.value?.chapter.number).toBe(3);
        expect(state.error.value).toBeNull();
      });

      it("does not restart the download when the same position is re-picked mid-flight", async () => {
        // The retry nudge must not fire for a request that is simply still on
        // its way, or waiting on a slow chapter and tapping it again would throw
        // away the bytes already downloaded.
        const { state, controlled } = await createStateWithHeldChapters();

        void state.selectChapter("GEN", 2);
        await waitFor(() => controlled.pending().includes(chapterUrl(2)));
        const requestsBefore = fetchMock.mock.calls.length;

        void state.selectChapter("GEN", 2);

        expect(fetchMock.mock.calls.length).toBe(requestsBefore);
        expect(controlled.aborted()).not.toContain(chapterUrl(2));
        expect(controlled.pending()).toEqual([chapterUrl(2)]);

        controlled.settle(chapterUrl(2));
        await waitFor(() => state.chapterData.value?.chapter.number === 2);
      });

      it("shows a chapter it already holds after a failed load, rather than the failure", async () => {
        // Reported from the browser: offline on Genesis 3, pressing previous
        // back to Genesis 2 looked like it failed too — even though Genesis 2 was
        // still sitting in `chapterData`, behind the banner. Genesis 1 then
        // loaded fine, because it needed a request (served from the response
        // cache) and so passed through the place the error was cleared.
        const responses = responsesThroughChapter(3);
        let offline = false;
        fetchMock.mockImplementation((url: string) => {
          if (offline) {
            return Promise.reject(new TypeError("Failed to fetch"));
          }
          const response = responses[url];
          if (!response) {
            throw new Error(`No mocked response for ${url}`);
          }
          return Promise.resolve(response);
        });

        const state = createBibleReadingState(createDataManager());
        await waitForInitialLoad(state);
        await state.loadNextChapter();
        expect(state.chapterData.value?.chapter.number).toBe(2);

        offline = true;

        await state.loadNextChapter();
        expect(state.chapterNumber.value).toBe(3);
        expect(state.error.value).not.toBeNull();

        // Back to the chapter we never stopped holding. No request is issued,
        // so this is the path the error clear used to miss entirely.
        await state.loadPreviousChapter();

        expect(state.chapterNumber.value).toBe(2);
        expect(state.chapterData.value?.chapter.number).toBe(2);
        expect(state.isChapterContentStale.value).toBe(false);
        expect(state.error.value).toBeNull();

        // And one further back still works offline, from the response cache —
        // the half of the report that already behaved.
        await state.loadPreviousChapter();

        expect(state.chapterNumber.value).toBe(1);
        expect(state.chapterData.value?.chapter.number).toBe(1);
        expect(state.error.value).toBeNull();
      });

      it("clears the error as the recovery navigation starts, not when it lands", async () => {
        // `BibleReader` renders the error banner in place of any content, so an
        // error left standing means the whole of the next chapter's download
        // shows neither dimmed text nor the loading placeholder.
        const responses = failingChapterResponses(3);
        const controlled = createControlledFetch(
          responses,
          (url) => url === chapterUrl(2)
        );
        fetchMock.mockImplementation(controlled.fetch);
        const state = createBibleReadingState(createDataManager());
        await waitForInitialLoad(state);

        await state.selectChapter("GEN", 3);
        expect(state.error.value).toContain("Status: 500");

        void state.selectChapter("GEN", 2);

        expect(state.error.value).toBeNull();
        expect(state.isChapterContentStale.value).toBe(true);

        controlled.settle(chapterUrl(2));
        await waitFor(() => state.chapterData.value?.chapter.number === 2);
        expect(state.error.value).toBeNull();
      });
    });
  });

  describe("chapterDataPromise", () => {
    it("resolves once the initial chapter arrives", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());

      expect(state.initialChapterLoadSettled.value).toBe(false);

      await expect(state.chapterDataPromise).resolves.toBeUndefined();

      expect(state.initialChapterLoadSettled.value).toBe(true);
      expect(state.chapterData.value).not.toBeNull();
    });

    it("resolves when the initial chapter load fails, instead of hanging", async () => {
      const responses = createReadingManagerResponseMap();
      responses[makeExampleUrl("/api/AAB/GEN/1.json")] = createResponse(
        { error: true },
        500,
        "Server Error"
      );
      setWebResponses(responses);

      const state = createBibleReadingState(createDataManager());

      // Anything suspended on this promise — including the server render —
      // would otherwise wait forever for content that is never coming.
      await expect(state.chapterDataPromise).resolves.toBeUndefined();

      expect(state.initialChapterLoadSettled.value).toBe(true);
      expect(state.chapterData.value).toBeNull();
      expect(state.error.value).toContain("Status: 500");
      expect(state.loading.value).toBe(false);
    });

    it("stays settled across later navigations", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);
      expect(state.initialChapterLoadSettled.value).toBe(true);

      // The latch describes the *first* load only, so a later navigation must
      // not put consumers back into a suspended state.
      await state.selectChapter("GEN", 5);

      expect(state.initialChapterLoadSettled.value).toBe(true);
    });
  });

  it("retryLoad() repeats the chapter selection that failed", async () => {
    const responses = createReadingManagerResponseMap();
    const chapterUrl = makeExampleUrl("/api/AAB/GEN/2.json");
    const chapterResponse = responses[chapterUrl]!;
    responses[chapterUrl] = createResponse(
      { error: true },
      500,
      "Server Error"
    );

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    await state.selectChapter("GEN", 2);
    expect(state.error.value).not.toBeNull();
    // The position moves optimistically even though the fetch failed; only the
    // content is left stale (still chapter 1) until a retry succeeds.
    expect(state.chapterNumber.value).toBe(2);
    expect(state.chapterData.value?.chapter.number).toBe(1);

    // Network recovers, then the user presses Reload.
    responses[chapterUrl] = chapterResponse;
    await state.retryLoad();

    expect(state.error.value).toBeNull();
    expect(state.chapterNumber.value).toBe(2);
    expect(state.chapterData.value?.chapter.number).toBe(2);
  });

  it("retryLoad() repeats the initial load when that is what failed", async () => {
    const responses = createReadingManagerResponseMap();
    const translationsUrl = makeExampleUrl("/api/available_translations.json");
    const translationsResponse = responses[translationsUrl]!;
    responses[translationsUrl] = createResponse(
      { error: true },
      500,
      "Server Error"
    );

    setWebResponses(responses);
    const state = createBibleReadingState(createDataManager());
    await waitForInitialLoad(state);

    expect(state.error.value).not.toBeNull();
    expect(state.chapterData.value).toBeNull();

    responses[translationsUrl] = translationsResponse;
    await state.retryLoad();

    expect(state.error.value).toBeNull();
    expect(state.chapterData.value?.chapter.number).toBe(1);
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

    it("still navigates, and reports failure, when the book catalog is missing", async () => {
      // An extension can commit content for a translation the loader has never
      // fetched a catalog for. Adjacency is normally computed from that catalog,
      // so this is the one case where it isn't available — and `hasNext` stays
      // true off the loaded chapter's link, so the chevron is enabled. Pressing
      // it has to actually do something rather than silently no-op.
      const responses = createReadingManagerResponseMap();
      responses[makeExampleUrl("/api/NIV/books.json")] = createResponse(
        { error: true },
        500,
        "Server Error"
      );
      responses[makeExampleUrl("/api/NIV/MAT/2.json")] = createResponse({
        ...makeChapter(nivBooks, "MAT", 2),
        translation: nivTranslation,
        book: nivBooks.books[0]!,
      });
      setWebResponses(responses);

      const navigateChapter = {
        ...makeChapter(nivBooks, "MAT", 1),
        translation: nivTranslation,
        book: nivBooks.books[0]!,
        nextChapterApiLink: "/api/NIV/MAT/2.json",
      };
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          navigateNext: () => ({ type: "navigate", chapter: navigateChapter }),
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");

      // The extension hands over NIV MAT 1 directly. NIV's own catalog request
      // fails, so `translationBooks` is left without it.
      await state.loadNextChapter();
      expect(state.translationId.value).toBe("NIV");
      expect(state.bookId.value).toBe("MAT");
      expect(state.translationBooks.value?.translation.id).not.toBe("NIV");

      state.disableExtension("x");
      state.error.value = null;

      // No catalog and no extension: the target comes from the loaded
      // chapter's own next link instead.
      await state.loadNextChapter();

      expect(state.chapterNumber.value).toBe(2);
      expect(state.chapterData.value?.chapter.number).toBe(2);
      expect(state.error.value).toBeNull();
      expect(state.loading.value).toBe(false);
    });

    it("reports a failed link-based navigation instead of leaving an unhandled rejection", async () => {
      // Same degraded path as above, but the linked chapter request fails. It
      // must surface through `state.error` rather than escaping as an unhandled
      // rejection, and must not leave `loading` stuck on.
      const responses = createReadingManagerResponseMap();
      responses[makeExampleUrl("/api/NIV/books.json")] = createResponse(
        { error: true },
        500,
        "Server Error"
      );
      responses[makeExampleUrl("/api/NIV/MAT/2.json")] = createResponse(
        { error: true },
        500,
        "Server Error"
      );
      setWebResponses(responses);

      const navigateChapter = {
        ...makeChapter(nivBooks, "MAT", 1),
        translation: nivTranslation,
        book: nivBooks.books[0]!,
        nextChapterApiLink: "/api/NIV/MAT/2.json",
      };
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          navigateNext: () => ({ type: "navigate", chapter: navigateChapter }),
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");
      await state.loadNextChapter();

      state.disableExtension("x");
      state.error.value = null;

      await expect(state.loadNextChapter()).resolves.toBeUndefined();

      expect(state.error.value).toBe(
        "Failed request to https://example.test/api/NIV/MAT/2.json. Status: 500 Server Error"
      );
      expect(state.loading.value).toBe(false);
    });

    it("retryLoad() does not run the navigation hooks a second time", async () => {
      const responses = createReadingManagerResponseMap();
      const chapterUrl = makeExampleUrl("/api/AAB/GEN/2.json");
      const chapterResponse = responses[chapterUrl]!;
      responses[chapterUrl] = createResponse({ error: true }, 500, "Error");
      setWebResponses(responses);

      const manager = createBibleReadingExtensionManager();
      const navigateNext = vi.fn().mockResolvedValue({ type: "default" });
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({ navigateNext }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");

      await state.loadNextChapter();
      expect(navigateNext).toHaveBeenCalledTimes(1);
      expect(state.error.value).not.toBeNull();

      responses[chapterUrl] = chapterResponse;
      await state.retryLoad();

      // A hook may act on the reader rather than just answer a question, so a
      // retry has to resume from the fetch, not from the top of the navigation.
      expect(navigateNext).toHaveBeenCalledTimes(1);
      expect(state.chapterNumber.value).toBe(2);
      expect(state.error.value).toBeNull();
    });

    it("retryLoad() still loads when a hook would now block the navigation", async () => {
      const responses = createReadingManagerResponseMap();
      const chapterUrl = makeExampleUrl("/api/AAB/GEN/2.json");
      const chapterResponse = responses[chapterUrl]!;
      responses[chapterUrl] = createResponse({ error: true }, 500, "Error");
      setWebResponses(responses);

      const manager = createBibleReadingExtensionManager();
      let calls = 0;
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          navigateNext: () => {
            calls += 1;
            // Lets the first navigation through, then blocks — an extension's
            // answer can depend on state that changed in the meantime.
            return calls === 1 ? { type: "default" } : { type: "prevent" };
          },
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");

      await state.loadNextChapter();
      expect(state.error.value).not.toBeNull();

      responses[chapterUrl] = chapterResponse;
      await state.retryLoad();

      // Re-asking the hooks would have returned "prevent" here, which bails out
      // before clearing the error and would leave the failure panel up with
      // nothing having happened.
      expect(state.error.value).toBeNull();
      expect(state.chapterNumber.value).toBe(2);
    });

    it("retryLoad() replays the chapter a playlist-style hook loaded, without advancing it", async () => {
      const responses = createReadingManagerResponseMap();
      const chapterUrl = makeExampleUrl("/api/AAB/GEN/2.json");
      const chapterResponse = responses[chapterUrl]!;
      responses[chapterUrl] = createResponse({ error: true }, 500, "Error");
      setWebResponses(responses);

      const manager = createBibleReadingExtensionManager();
      let step = 0;
      let stateRef: BibleReadingState | null = null;
      manager.registerReadingExtension({
        id: "playlist",
        activate: (): ReadingExtensionInstance => ({
          // The shape PlaylistManager uses: advance the step, drive the load
          // itself, then report the navigation as blocked.
          navigateNext: async () => {
            step += 1;
            await stateRef!.selectTranslationAndChapter("AAB", "GEN", 1 + step);
            return { type: "prevent" };
          },
        }),
      });

      const state = createStateWithExtensions(manager);
      stateRef = state;
      await waitForInitialLoad(state);
      state.enableExtension("playlist");

      await state.loadNextChapter();
      expect(step).toBe(1);
      expect(state.error.value).not.toBeNull();

      responses[chapterUrl] = chapterResponse;
      await state.retryLoad();

      // Reload retries the chapter the playlist moved to; it must not advance
      // the playlist to the step after it.
      expect(step).toBe(1);
      expect(state.chapterNumber.value).toBe(2);
      expect(state.error.value).toBeNull();
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

  describe("onNavigate", () => {
    function withNivResponses(responses: WebResponseMap): WebResponseMap {
      responses[makeExampleUrl("/api/NIV/books.json")] =
        createResponse(nivBooks);
      responses[makeExampleUrl("/api/NIV/MAT/1.json")] = createResponse({
        ...makeChapter(bsbBooks, "MAT", 1),
        translation: nivTranslation,
        book: nivBooks.books[0]!,
        thisChapterLink: "/api/NIV/MAT/1.json",
        nextChapterApiLink: "/api/NIV/MAT/2.json",
        previousChapterApiLink: null,
      });
      responses[makeExampleUrl("/api/NIV/MAT/3.json")] = createResponse({
        ...makeChapter(nivBooks, "MAT", 3),
        translation: nivTranslation,
        book: nivBooks.books[0]!,
        thisChapterLink: "/api/NIV/MAT/3.json",
        nextChapterApiLink: "/api/NIV/MAT/4.json",
        previousChapterApiLink: "/api/NIV/MAT/2.json",
      });
      return responses;
    }

    function createStateWithExtension(instance: ReadingExtensionInstance) {
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({ id: "x", activate: () => instance });
      return createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        undefined,
        manager
      );
    }

    it("does not fire during initial load", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      const listener = vi.fn();
      // Subscribe before the initial load settles so any emit would be caught.
      state.onNavigate(listener);

      await waitForInitialLoad(state);

      expect(listener).not.toHaveBeenCalled();
    });

    it("fires once with { replace: false } when selecting a chapter", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectChapter("GEN", 5);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: false });
    });

    it("fires once with { replace: false } when selecting a book", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectBook("EXO");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: false });
    });

    it("fires once with { replace: false } when selecting a translation", async () => {
      setWebResponses(withNivResponses(createReadingManagerResponseMap()));
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectTranslation("NIV");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: false });
    });

    it("fires once with { replace: false } when selecting a translation, book, and chapter", async () => {
      setWebResponses(withNivResponses(createReadingManagerResponseMap()));
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectTranslationAndChapter("NIV", "MAT", 3);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: false });
    });

    it("replaces rather than pushes for navigations that continue the same gesture", async () => {
      // A skim is one gesture, so it should cost one Back press. Only the first
      // press of a burst gets a history entry; the rest overwrite it, leaving
      // the reader back where the skim started.
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.loadNextChapter();
      expect(listener).toHaveBeenLastCalledWith({ replace: false });

      await state.loadPreviousChapter();
      await state.loadNextChapter();
      await state.loadNextChapter();

      expect(listener).toHaveBeenCalledTimes(4);
      expect(
        listener.mock.calls.filter((call) => call[0].replace === false).length
      ).toBe(1);
    });

    it("pushes again once the reader pauses between navigations", async () => {
      // The flip side: reading a chapter and then deliberately moving on is two
      // destinations, and Back has to return you to the first.
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.loadNextChapter();
      expect(listener).toHaveBeenLastCalledWith({ replace: false });

      // Real elapsed time rather than a stubbed clock: `performance.now()` is
      // read by test infrastructure too, so mocking it globally would be a
      // sharper tool than this needs.
      await new Promise((resolve) =>
        setTimeout(resolve, NAVIGATION_COALESCE_MS + 100)
      );

      await state.loadNextChapter();
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({ replace: false });
    });

    it("replaces rather than pushes when the position does not actually change", async () => {
      // Re-picking the chapter you are already on is not a destination, so it
      // must not cost a Back press. The URL is still rewritten, because it can
      // be out of step with the position for reasons other than a move.
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectChapter("GEN", 1);

      expect(state.chapterNumber.value).toBe(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: true });
    });

    it("still pushes when only the verse changes within the current chapter", async () => {
      // Jumping to another verse in the chapter you are reading — a playlist
      // step, a deep link — is somewhere new, and Back has to return you.
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectTranslationAndChapter("AAB", "GEN", 1, {
        scrollToVerse: 4,
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: false });
    });

    it("does not let a no-op apply drag the next real navigation into its history entry", async () => {
      // A redundant apply is not a gesture, so it must not start the coalescing
      // window — otherwise re-picking the current chapter and then pressing next
      // would overwrite the entry instead of adding one.
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectChapter("GEN", 1);
      await state.loadNextChapter();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({ replace: false });
    });

    it("corrects an out-of-range chapter from the URL with a replace, not a push", async () => {
      // `?chapter=99999` renders as intent first — the position signals move
      // before any catalog is available to judge them — and is corrected once
      // the catalog lands. That correction has to reach the URL, or Back sends
      // the reader to the bad address and bounces them straight back.
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager(), {
        initialTranslationId: "AAB",
        initialBookId: "GEN",
        initialChapterNumber: 99999,
      });

      const listener = vi.fn();
      state.onNavigate(listener);

      await waitForInitialLoad(state);

      expect(state.chapterNumber.value).toBe(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: true });
    });

    it("does not fire onNavigate when the URL names a book the translation lacks", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager(), {
        initialTranslationId: "AAB",
        initialBookId: "ZZZ",
        initialChapterNumber: 1,
      });

      const listener = vi.fn();
      state.onNavigate(listener);

      await waitForInitialLoad(state);

      // No silent substitution to a real book — bookId/chapterNumber stay
      // exactly as requested so the UI can detect "book not found", and
      // since nothing was corrected, no navigation event fires.
      expect(state.bookId.value).toBe("ZZZ");
      expect(state.chapterNumber.value).toBe(1);
      expect(state.error.value).toBeNull();
      expect(listener).not.toHaveBeenCalled();
    });

    it("does not fire when the navigation is driven from the URL (updateUrl: false)", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.selectTranslationAndChapter("AAB", "GEN", 5, {
        updateUrl: false,
      });

      expect(state.chapterNumber.value).toBe(5);
      expect(listener).not.toHaveBeenCalled();
    });

    it("does not fire for verse selection or clearing", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      state.selectVerse(
        { bookId: "GEN", chapterNumber: 1, verse: makeVerse(1) } as any,
        0,
        0
      );
      state.clearSelectedVerses();

      expect(listener).not.toHaveBeenCalled();
    });

    it("fires with { replace: true } when enabling and disabling an extension", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({ id: "x", activate: () => ({}) });

      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        undefined,
        manager
      );
      await waitForInitialLoad(state);

      const listener = vi.fn();
      state.onNavigate(listener);

      state.enableExtension("x");
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith({ replace: true });

      state.disableExtension("x");
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({ replace: true });
    });

    it("stops notifying after the returned unsubscribe is called", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const listener = vi.fn();
      const unsubscribe = state.onNavigate(listener);

      await state.selectChapter("GEN", 2);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      await state.selectChapter("GEN", 5);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies every subscribed listener", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      const first = vi.fn();
      const second = vi.fn();
      state.onNavigate(first);
      state.onNavigate(second);

      await state.selectChapter("GEN", 2);

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it("does not notify listeners after the reading state is disposed", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({ id: "x", activate: () => ({}) });

      const state = createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        undefined,
        manager
      );
      await waitForInitialLoad(state);

      state.enableExtension("x");

      const listener = vi.fn();
      state.onNavigate(listener);

      // dispose() disables extensions internally; that must not emit to
      // listeners of a state that is being torn down.
      state.dispose();

      expect(listener).not.toHaveBeenCalled();
    });

    it("fires once with { replace: false } when a hook handles loading the next chapter", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const navigateNext = vi.fn().mockReturnValue({ type: "handled" });
      const state = createStateWithExtension({ navigateNext });
      await waitForInitialLoad(state);
      state.enableExtension("x");

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.loadNextChapter();

      // The extension handled the navigation itself, so the chapter does not
      // change here — but the URL still needs to be updated to match.
      expect(navigateNext).toHaveBeenCalledTimes(1);
      expect(state.chapterNumber.value).toBe(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: false });
    });

    it("fires once with { replace: false } when a hook handles loading the previous chapter", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const navigatePrevious = vi.fn().mockReturnValue({ type: "handled" });
      const state = createStateWithExtension({ navigatePrevious });
      await waitForInitialLoad(state);
      state.enableExtension("x");

      const listener = vi.fn();
      state.onNavigate(listener);

      await state.loadPreviousChapter();

      expect(navigatePrevious).toHaveBeenCalledTimes(1);
      expect(state.chapterNumber.value).toBe(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ replace: false });
    });
  });

  describe("title / shortTitle / subTitle", () => {
    function createStateWithExtensions(
      readingExtensionManager: ReturnType<
        typeof createBibleReadingExtensionManager
      >
    ) {
      return createRawBibleReadingState(
        createDataManager(),
        createHighlightsManagerMock() as any,
        createI18nManager(createNavigationManager(), ["en"]),
        {},
        undefined,
        readingExtensionManager
      );
    }

    it("title defaults to '<book name> <chapter>' and tracks navigation", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      expect(state.title.value).toBe("Genesis 1");

      await state.selectChapter("GEN", 5);
      expect(state.title.value).toBe("Genesis 5");

      await state.selectBook("EXO");
      expect(state.title.value).toBe("Exodus 1");
    });

    it("shortTitle defaults to '<book id> <chapter>' and tracks navigation", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      expect(state.shortTitle.value).toBe("GEN 1");

      await state.selectChapter("GEN", 5);
      expect(state.shortTitle.value).toBe("GEN 5");

      await state.selectBook("EXO");
      expect(state.shortTitle.value).toBe("EXO 1");
    });

    it("subTitle defaults to the current translation name", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      expect(state.subTitle.value).toBe("Accessible Ancients Bible");
    });

    it("shortSubTitle defaults to the current translation short name", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);

      expect(state.shortSubTitle.value).toBe("AAB");
    });

    it("names the book from the catalog, not the chapter still on screen", async () => {
      // Titles are resolved from the books catalog, which tracks `bookId`
      // synchronously, rather than from `chapterData`, which still describes
      // the chapter the reader left. Crossing a book boundary is where the two
      // disagree: content-first would title this "Genesis 1" until the text of
      // Exodus arrived.
      const responses = createReadingManagerResponseMap();
      responses[makeExampleUrl("/api/AAB/EXO/1.json")] = createResponse(
        makeChapter(aabBooks, "EXO", 1)
      );
      const controlled = createControlledFetch(responses, (url) =>
        /\/api\/AAB\/EXO\/1\.json$/.test(url)
      );
      fetchMock.mockImplementation(controlled.fetch);

      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);
      expect(state.title.value).toBe("Genesis 1");

      void state.selectBook("EXO");

      expect(state.title.value).toBe("Exodus 1");
      expect(state.chapterData.value?.book.id).toBe("GEN");
      expect(state.isChapterContentStale.value).toBe(true);

      controlled.settle(makeExampleUrl("/api/AAB/EXO/1.json"));
      await waitFor(() => !state.isChapterContentStale.value);
      expect(state.title.value).toBe("Exodus 1");
    });

    it("names the translation from the catalog while a new one's text is in flight", async () => {
      // Same rule for the subtitle: it follows `translationId` rather than the
      // translation named by whichever chapter is still rendered.
      const responses = createReadingManagerResponseMap();
      responses[makeExampleUrl("/api/NIV/books.json")] =
        createResponse(nivBooks);
      responses[makeExampleUrl("/api/NIV/MAT/1.json")] = createResponse({
        ...makeChapter(nivBooks, "MAT", 1),
        translation: nivTranslation,
        book: nivBooks.books[0]!,
      });
      const controlled = createControlledFetch(responses, (url) =>
        /\/api\/NIV\/MAT\/1\.json$/.test(url)
      );
      fetchMock.mockImplementation(controlled.fetch);

      const state = createBibleReadingState(createDataManager());
      await waitForInitialLoad(state);
      expect(state.subTitle.value).toBe("Accessible Ancients Bible");

      void state.selectTranslation("NIV");
      await waitFor(() => controlled.pending().length > 0);

      expect(state.shortSubTitle.value).toBe("NIV");
      expect(state.subTitle.value).toBe(nivTranslation.name);
      // The chapter still on screen is the old translation's.
      expect(state.chapterData.value?.translation.id).toBe("AAB");
    });

    it("lets an enabled extension override each title, restoring the defaults on disable", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          transformTitle: ({ label }) => `title: ${label}`,
          transformShortTitle: ({ label }) => `short: ${label}`,
          transformSubTitle: ({ label }) => `sub: ${label}`,
          transformShortSubTitle: ({ label }) => `shortSub: ${label}`,
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);

      expect(state.title.value).toBe("Genesis 1");
      expect(state.shortTitle.value).toBe("GEN 1");
      expect(state.subTitle.value).toBe("Accessible Ancients Bible");
      expect(state.shortSubTitle.value).toBe("AAB");

      state.enableExtension("x");
      expect(state.title.value).toBe("title: Genesis 1");
      expect(state.shortTitle.value).toBe("short: GEN 1");
      expect(state.subTitle.value).toBe("sub: Accessible Ancients Bible");
      expect(state.shortSubTitle.value).toBe("shortSub: AAB");

      state.disableExtension("x");
      expect(state.title.value).toBe("Genesis 1");
      expect(state.shortTitle.value).toBe("GEN 1");
      expect(state.subTitle.value).toBe("Accessible Ancients Bible");
      expect(state.shortSubTitle.value).toBe("AAB");
    });

    it("each title transform is independent (an extension can override one without touching the others)", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "x",
        activate: (): ReadingExtensionInstance => ({
          transformShortTitle: () => "custom short",
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("x");

      expect(state.shortTitle.value).toBe("custom short");
      // Untouched hooks fall through to the defaults.
      expect(state.title.value).toBe("Genesis 1");
      expect(state.subTitle.value).toBe("Accessible Ancients Bible");
      expect(state.shortSubTitle.value).toBe("AAB");
    });

    it("applies transform hooks in priority order (higher first)", async () => {
      setWebResponses(createReadingManagerResponseMap());
      const manager = createBibleReadingExtensionManager();
      manager.registerReadingExtension({
        id: "low",
        priority: 1,
        activate: (): ReadingExtensionInstance => ({
          transformTitle: ({ label }) => `L>${label}`,
        }),
      });
      manager.registerReadingExtension({
        id: "high",
        priority: 100,
        activate: (): ReadingExtensionInstance => ({
          transformTitle: ({ label }) => `H>${label}`,
        }),
      });

      const state = createStateWithExtensions(manager);
      await waitForInitialLoad(state);
      state.enableExtension("low");
      state.enableExtension("high");

      // "high" runs first (inner), "low" wraps its output (outer).
      expect(state.title.value).toBe("L>H>Genesis 1");
    });
  });
});
