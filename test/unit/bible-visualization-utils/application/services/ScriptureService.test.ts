import { ScriptureService } from "bibleVizUtils.application.services.ScriptureService";
import type {
  SubsetBookInfo,
  BookInfo,
  ArrangementInfo,
} from "bibleVizUtils.domain.models.arrangement";

// ─── factories ────────────────────────────────────────────────────────────────

const makeSubset = (
  overrides: Partial<SubsetBookInfo> = {}
): SubsetBookInfo => ({
  type: "subset",
  bookId: "subset-book",
  completeBookId: "complete-book",
  author: "unknown",
  chaptersVerseCount: [10],
  numberOfChapters: 10,
  relativeDateRange: { min: 0, max: 0 },
  path: {
    arrangementName: "default",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
  ...overrides,
});

const makeCompleteBook = (
  bookId: string,
  chaptersVerseCount: number[]
): BookInfo => ({
  type: "complete",
  bookId,
  author: "unknown",
  chaptersVerseCount,
  numberOfChapters: chaptersVerseCount.length,
  relativeDateRange: { min: 0, max: 0 },
  path: {
    arrangementName: "default",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
});

const makeArrangement = (books: BookInfo[]): ArrangementInfo => ({
  name: "test-arrangement",
  testaments: [
    {
      name: "OT",
      sections: [
        {
          name: "Law",
          color: "#ffffff",
          books,
          path: {
            arrangementName: "default",
            testamentIndex: 0,
            sectionIndex: 0,
          },
        },
      ],
    },
  ],
});

const makeDataRepo = (
  bookStaticInfoMap: Record<
    string,
    { chaptersVerseCount: readonly number[]; numberOfChapters: number }
  > = {}
) => ({
  getBookStaticInfo: jest.fn((bookId: string) => bookStaticInfoMap[bookId]),
});

const makeArrangementPort = (
  overrides: {
    getCurrentArrangementIndex?: () => number;
    getArrangementByIndex?: (i: number) => ArrangementInfo | undefined;
    getAllArrangements?: () => ArrangementInfo[];
  } = {}
) => ({
  getCurrentArrangementIndex: jest.fn().mockReturnValue(0),
  getArrangementByIndex: jest.fn().mockReturnValue(undefined),
  getAllArrangements: jest.fn().mockReturnValue([]),
  ...overrides,
});

const makeService = (
  dataRepo = makeDataRepo(),
  arrangementPort = makeArrangementPort()
) => new ScriptureService(dataRepo, arrangementPort);

// ─── constructor ─────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("calls getCurrentArrangementIndex once to initialise the cached arrangement index", () => {
    const arrangementPort = makeArrangementPort();
    makeService(makeDataRepo(), arrangementPort);
    expect(arrangementPort.getCurrentArrangementIndex).toHaveBeenCalledTimes(1);
  });
});

// ─── mapSubsetToCompleteBook ──────────────────────────────────────────────────

describe("mapSubsetToCompleteBook", () => {
  it("adds startIndex to the chapter number", () => {
    const svc = makeService();
    const result = svc.mapSubsetToCompleteBook({
      book: makeSubset({ startIndex: 5, completeBookId: "genesis" }),
      chapter: 3,
    });
    expect(result.chapter).toBe(8);
  });

  it("defaults startIndex to 0 when not provided", () => {
    const svc = makeService();
    const result = svc.mapSubsetToCompleteBook({
      book: makeSubset({ startIndex: undefined, completeBookId: "genesis" }),
      chapter: 7,
    });
    expect(result.chapter).toBe(7);
  });

  it("returns the completeBookId as bookId", () => {
    const svc = makeService();
    const result = svc.mapSubsetToCompleteBook({
      book: makeSubset({ completeBookId: "psalms" }),
      chapter: 1,
    });
    expect(result.bookId).toBe("psalms");
  });

  it("works correctly with startIndex=0", () => {
    const svc = makeService();
    const result = svc.mapSubsetToCompleteBook({
      book: makeSubset({ startIndex: 0, completeBookId: "exodus" }),
      chapter: 10,
    });
    expect(result).toEqual({ chapter: 10, bookId: "exodus" });
  });
});

// ─── mapCompleteToSubsetBook ──────────────────────────────────────────────────

describe("mapCompleteToSubsetBook", () => {
  it("throws when no subset covers the given chapter", () => {
    const svc = makeService();
    const subsets = [makeSubset({ startIndex: 0, numberOfChapters: 5 })];
    // chapters 1–5 are covered; chapter 10 is not
    expect(() => svc.mapCompleteToSubsetBook({ chapter: 10, subsets })).toThrow(
      "no subset found for chapter 10"
    );
  });

  it("finds the subset whose range contains the chapter (startIndex=0)", () => {
    const svc = makeService();
    const subset = makeSubset({
      startIndex: 0,
      numberOfChapters: 10,
      bookId: "genesis-part-1",
      completeBookId: "genesis",
    });
    // start = 0+1=1, end = 0+10=10 → covers 1..10
    const result = svc.mapCompleteToSubsetBook({
      chapter: 5,
      subsets: [subset],
    });
    expect(result.bookId).toBe("genesis-part-1");
    expect(result.completeBookId).toBe("genesis");
  });

  it("returns chapter - startIndex as the subset-relative chapter", () => {
    const svc = makeService();
    const subset = makeSubset({ startIndex: 10, numberOfChapters: 10 });
    // start=11, end=20 → chapter=15 → mapped=15-10=5
    const result = svc.mapCompleteToSubsetBook({
      chapter: 15,
      subsets: [subset],
    });
    expect(result.chapter).toBe(5);
  });

  it("treats missing startIndex as 0 for both range and chapter mapping", () => {
    const svc = makeService();
    const subset = makeSubset({
      startIndex: undefined,
      numberOfChapters: 20,
      bookId: "psalms-1",
      completeBookId: "psalms",
    });
    // start=1, end=20 → chapter=12 → mapped=12-0=12
    const result = svc.mapCompleteToSubsetBook({
      chapter: 12,
      subsets: [subset],
    });
    expect(result.chapter).toBe(12);
    expect(result.bookId).toBe("psalms-1");
    expect(result.completeBookId).toBe("psalms");
  });

  it("picks the correct subset when multiple subsets exist", () => {
    const svc = makeService();
    const first = makeSubset({
      startIndex: 0,
      numberOfChapters: 10,
      bookId: "gen-a",
      completeBookId: "genesis",
    });
    const second = makeSubset({
      startIndex: 10,
      numberOfChapters: 10,
      bookId: "gen-b",
      completeBookId: "genesis",
    });
    // chapter=15 falls in second (start=11, end=20)
    const result = svc.mapCompleteToSubsetBook({
      chapter: 15,
      subsets: [first, second],
    });
    expect(result.bookId).toBe("gen-b");
    expect(result.chapter).toBe(5);
  });

  it("chapter exactly at start of range is included", () => {
    const svc = makeService();
    const subset = makeSubset({ startIndex: 0, numberOfChapters: 10 });
    // start=1 → chapter 1 is the lower boundary
    const result = svc.mapCompleteToSubsetBook({
      chapter: 1,
      subsets: [subset],
    });
    expect(result.chapter).toBe(1);
  });

  it("chapter exactly at end of range is included", () => {
    const svc = makeService();
    const subset = makeSubset({ startIndex: 0, numberOfChapters: 10 });
    // end=10 → chapter 10 is the upper boundary
    const result = svc.mapCompleteToSubsetBook({
      chapter: 10,
      subsets: [subset],
    });
    expect(result.chapter).toBe(10);
  });

  it("chapter one beyond the end is not included", () => {
    const svc = makeService();
    const subset = makeSubset({ startIndex: 0, numberOfChapters: 10 });
    expect(() =>
      svc.mapCompleteToSubsetBook({ chapter: 11, subsets: [subset] })
    ).toThrow();
  });
});

// ─── getBiggerChapter ─────────────────────────────────────────────────────────

describe("getBiggerChapter", () => {
  it("throws when the arrangement is not found", () => {
    const arrangementPort = makeArrangementPort({
      getArrangementByIndex: jest.fn().mockReturnValue(undefined),
    });
    const svc = makeService(makeDataRepo(), arrangementPort);
    expect(() => svc.getBiggerChapter(0)).toThrow(
      "arrangement not found at getBiggerChapter"
    );
  });

  it("throws when bookInfo is not found for a book in the arrangement", () => {
    const arrangement = makeArrangement([makeCompleteBook("genesis", [30])]);
    const arrangementPort = makeArrangementPort({
      getArrangementByIndex: jest.fn().mockReturnValue(arrangement),
    });
    // dataRepo returns undefined for all bookIds
    const svc = makeService(makeDataRepo(), arrangementPort);
    expect(() => svc.getBiggerChapter(0)).toThrow(
      "bookInfo not found at getBiggerChapter"
    );
  });

  it("returns the maximum value across all chaptersVerseCount entries of all books", () => {
    const books = [
      makeCompleteBook("genesis", [30, 25, 40]),
      makeCompleteBook("exodus", [50, 10, 20]),
    ];
    const arrangement = makeArrangement(books);
    const dataRepo = makeDataRepo({
      genesis: { chaptersVerseCount: [30, 25, 40], numberOfChapters: 3 },
      exodus: { chaptersVerseCount: [50, 10, 20], numberOfChapters: 3 },
    });
    const arrangementPort = makeArrangementPort({
      getArrangementByIndex: jest.fn().mockReturnValue(arrangement),
    });
    const svc = makeService(dataRepo, arrangementPort);
    expect(svc.getBiggerChapter(0)).toBe(50);
  });

  it("returns 0 when the arrangement has no books", () => {
    const arrangement = makeArrangement([]);
    const arrangementPort = makeArrangementPort({
      getArrangementByIndex: jest.fn().mockReturnValue(arrangement),
    });
    const svc = makeService(makeDataRepo(), arrangementPort);
    expect(svc.getBiggerChapter(0)).toBe(0);
  });

  it("caches the result — getArrangementByIndex is not called again for the same index", () => {
    const books = [makeCompleteBook("genesis", [31])];
    const arrangement = makeArrangement(books);
    const getByIndex = jest.fn().mockReturnValue(arrangement);
    const arrangementPort = makeArrangementPort({
      getArrangementByIndex: getByIndex,
    });
    const dataRepo = makeDataRepo({
      genesis: { chaptersVerseCount: [31], numberOfChapters: 1 },
    });
    const svc = makeService(dataRepo, arrangementPort);
    svc.getBiggerChapter(0);
    svc.getBiggerChapter(0);
    expect(getByIndex).toHaveBeenCalledTimes(1);
  });

  it("recomputes when the arrangement index changes", () => {
    const books = [makeCompleteBook("genesis", [31])];
    const arrangement = makeArrangement(books);
    const getByIndex = jest.fn().mockReturnValue(arrangement);
    const arrangementPort = makeArrangementPort({
      getArrangementByIndex: getByIndex,
    });
    const dataRepo = makeDataRepo({
      genesis: { chaptersVerseCount: [31], numberOfChapters: 1 },
    });
    const svc = makeService(dataRepo, arrangementPort);
    svc.getBiggerChapter(0);
    svc.getBiggerChapter(1);
    expect(getByIndex).toHaveBeenCalledTimes(2);
  });

  it("uses getCurrentArrangementIndex as default when called with no argument", () => {
    const books = [makeCompleteBook("genesis", [31])];
    const arrangement = makeArrangement(books);
    const getCurrentArrangementIndex = jest.fn().mockReturnValue(2);
    const getByIndex = jest.fn().mockReturnValue(arrangement);
    const arrangementPort = makeArrangementPort({
      getCurrentArrangementIndex,
      getArrangementByIndex: getByIndex,
    });
    const dataRepo = makeDataRepo({
      genesis: { chaptersVerseCount: [31], numberOfChapters: 1 },
    });
    const svc = makeService(dataRepo, arrangementPort);
    svc.getBiggerChapter();
    expect(getByIndex).toHaveBeenCalledWith(2);
  });

  it("returns the cached value unchanged on subsequent calls with same index", () => {
    const books = [makeCompleteBook("genesis", [42])];
    const arrangement = makeArrangement(books);
    const arrangementPort = makeArrangementPort({
      getArrangementByIndex: jest.fn().mockReturnValue(arrangement),
    });
    const dataRepo = makeDataRepo({
      genesis: { chaptersVerseCount: [42], numberOfChapters: 1 },
    });
    const svc = makeService(dataRepo, arrangementPort);
    const first = svc.getBiggerChapter(0);
    const second = svc.getBiggerChapter(0);
    expect(first).toBe(42);
    expect(second).toBe(42);
  });
});

// ─── getSectionChapterCount ───────────────────────────────────────────────────

describe("getSectionChapterCount", () => {
  it("returns 0 for an empty section", () => {
    const svc = makeService();
    expect(svc.getSectionChapterCount([])).toBe(0);
  });

  it("returns the numberOfChapters of a single book", () => {
    const svc = makeService();
    const book = makeCompleteBook("genesis", new Array(50).fill(0));
    expect(svc.getSectionChapterCount([book])).toBe(50);
  });

  it("sums numberOfChapters across all books in the section", () => {
    const svc = makeService();
    const books = [
      makeCompleteBook("genesis", new Array(50).fill(0)),
      makeCompleteBook("exodus", new Array(40).fill(0)),
      makeCompleteBook("leviticus", new Array(27).fill(0)),
    ];
    expect(svc.getSectionChapterCount(books)).toBe(117);
  });

  it("treats undefined numberOfChapters as 0", () => {
    const svc = makeService();
    const book = {
      ...makeCompleteBook("gen", []),
      numberOfChapters: undefined as any,
    };
    expect(svc.getSectionChapterCount([book])).toBe(0);
  });
});

// ─── getBookChapterCount ──────────────────────────────────────────────────────

describe("getBookChapterCount", () => {
  it("throws when getBookStaticInfo returns undefined for the bookId", () => {
    const svc = makeService(makeDataRepo());
    expect(() => svc.getBookChapterCount("unknown-book")).toThrow(
      "bookStaticInfo not found at getBookChapterCount for unknown-book"
    );
  });

  it("includes the bookId in the error message", () => {
    const svc = makeService(makeDataRepo());
    expect(() => svc.getBookChapterCount("psalms")).toThrow("psalms");
  });

  it("returns numberOfChapters from getBookStaticInfo", () => {
    const dataRepo = makeDataRepo({
      genesis: { chaptersVerseCount: [], numberOfChapters: 50 },
    });
    const svc = makeService(dataRepo);
    expect(svc.getBookChapterCount("genesis")).toBe(50);
  });

  it("calls getBookStaticInfo with the given bookId", () => {
    const dataRepo = makeDataRepo({
      exodus: { chaptersVerseCount: [], numberOfChapters: 40 },
    });
    const svc = makeService(dataRepo);
    svc.getBookChapterCount("exodus");
    expect(dataRepo.getBookStaticInfo).toHaveBeenCalledWith("exodus");
  });
});
