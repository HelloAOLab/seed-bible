import { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import {
  SelectionStates,
  SelectionEvents,
} from "bibleVizUtils.domain.models.selection";

// ─── factories ───────────────────────────────────────────────────────────────

const makeCreationParams = (overrides: any = {}) => ({
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  amountOfChaptersInSection: 10,
  ...overrides,
});

const makeSectionPiece = (id = "sp1") => ({
  id,
  type: "StackSectionBook" as const,
});

const makeSectionInfo = (name = "Pentateuch") =>
  ({
    name,
    color: "#ff0000",
    books: [],
    path: { arrangementName: "Standard", testamentIndex: 0, sectionIndex: 0 },
  }) as any;

const makeBookInfo = (bookId = "gen") =>
  ({
    bookId,
    type: "complete" as const,
    author: "Moses",
    chaptersVerseCount: [31],
    relativeDateRange: { min: -1446, max: -1406 },
    numberOfChapters: 50,
    path: {
      arrangementName: "Standard",
      testamentIndex: 0,
      sectionIndex: 0,
      bookIndex: 0,
    },
  }) as any;

const makeSectionBook = (overrides: any = {}) =>
  new StackSectionBookData({
    id: "sb-1",
    pieceInfo: makeSectionInfo(),
    pieceBookInfo: makeBookInfo(),
    creationParams: makeCreationParams(),
    ...overrides,
  });

const makeChapter = (overrides: any = {}) =>
  new StackChapterData({
    id: "chapter-1",
    pieceInfo: { amountOfVerses: 31, number: 1 },
    parentDataIds: {} as any,
    isInsideBible: true,
    creationParams: { bookId: "gen" },
    ...overrides,
  });

// Advances a book (standardSelectionFSM) all the way to Selected state.
const selectSectionBook = (book: StackSectionBookData) => {
  book.changeSelectionState(SelectionEvents.RequestSelect); // Idle → Selecting
  book.changeSelectionState(SelectionEvents.SequenceComplete); // Selecting → Selected
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StackSectionBookData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the pieceBookInfo by reference", () => {
      const bookInfo = makeBookInfo("exo");
      expect(makeSectionBook({ pieceBookInfo: bookInfo }).pieceBookInfo).toBe(
        bookInfo
      );
    });

    it("stores the pieceInfo (SectionInfo) by reference", () => {
      const sectionInfo = makeSectionInfo("Historical");
      expect(makeSectionBook({ pieceInfo: sectionInfo }).pieceInfo).toBe(
        sectionInfo
      );
    });

    it("defaults isInsideTestament to true", () => {
      expect(makeSectionBook().isInsideTestament).toBe(true);
    });

    it("stores isInsideTestament=false when provided", () => {
      expect(
        makeSectionBook({ isInsideTestament: false }).isInsideTestament
      ).toBe(false);
    });

    it("defaults isActive to false", () => {
      expect(makeSectionBook().isActive).toBe(false);
    });

    it("defaults selectionState to Idle", () => {
      expect(makeSectionBook().selectionState).toBe(SelectionStates.Idle);
    });

    it("when isSelected=true, advances selectionState to Selecting (standardSelectionFSM first step)", () => {
      expect(makeSectionBook({ isSelected: true }).selectionState).toBe(
        SelectionStates.Selecting
      );
    });

    it("defaults currentShape to undefined", () => {
      expect(makeSectionBook().currentShape).toBeUndefined();
    });

    it("stores a provided initial shape", () => {
      expect(makeSectionBook({ currentShape: "Regular" }).currentShape).toBe(
        "Regular"
      );
    });

    it("defaults childrenData to an empty array", () => {
      expect(makeSectionBook().childrenData).toEqual([]);
    });

    it("stores provided childrenData", () => {
      const ch = makeChapter();
      expect(makeSectionBook({ childrenData: [ch] }).childrenData).toEqual([
        ch,
      ]);
    });
  });

  // ─── pieceBookInfo ───────────────────────────────────────────────────────────

  describe("pieceBookInfo", () => {
    it("returns the stored BookInfo by reference", () => {
      const bookInfo = makeBookInfo("lev");
      expect(makeSectionBook({ pieceBookInfo: bookInfo }).pieceBookInfo).toBe(
        bookInfo
      );
    });

    it("reflects different bookIds for different instances", () => {
      const sb1 = makeSectionBook({ pieceBookInfo: makeBookInfo("gen") });
      const sb2 = makeSectionBook({ pieceBookInfo: makeBookInfo("exo") });
      expect(sb1.pieceBookInfo.bookId).toBe("gen");
      expect(sb2.pieceBookInfo.bookId).toBe("exo");
    });
  });

  // ─── getPieceBookInfoProperty ────────────────────────────────────────────────

  describe("getPieceBookInfoProperty", () => {
    it("returns the value for 'bookId'", () => {
      const book = makeSectionBook({ pieceBookInfo: makeBookInfo("num") });
      expect(book.getPieceBookInfoProperty("bookId")).toBe("num");
    });

    it("returns the value for 'type'", () => {
      const book = makeSectionBook({ pieceBookInfo: makeBookInfo("gen") });
      expect(book.getPieceBookInfoProperty("type")).toBe("complete");
    });

    it("returns the value for 'numberOfChapters'", () => {
      const bookInfo = { ...makeBookInfo("gen"), numberOfChapters: 50 } as any;
      const book = makeSectionBook({ pieceBookInfo: bookInfo });
      expect(book.getPieceBookInfoProperty("numberOfChapters")).toBe(50);
    });

    it("returns the value for 'author'", () => {
      const bookInfo = { ...makeBookInfo("gen"), author: "Isaiah" } as any;
      const book = makeSectionBook({ pieceBookInfo: bookInfo });
      expect(book.getPieceBookInfoProperty("author")).toBe("Isaiah");
    });
  });

  // ─── index getters ───────────────────────────────────────────────────────────

  describe("index getters", () => {
    it("getArrangementIndex returns arrangementIndex from creationParams", () => {
      expect(
        makeSectionBook({
          creationParams: makeCreationParams({ arrangementIndex: 3 }),
        }).getArrangementIndex()
      ).toBe(3);
    });

    it("getTestamentIndex returns testamentIndex from creationParams", () => {
      expect(
        makeSectionBook({
          creationParams: makeCreationParams({ testamentIndex: 1 }),
        }).getTestamentIndex()
      ).toBe(1);
    });

    it("getSectionIndex returns sectionIndex from creationParams", () => {
      expect(
        makeSectionBook({
          creationParams: makeCreationParams({ sectionIndex: 2 }),
        }).getSectionIndex()
      ).toBe(2);
    });
  });

  // ─── resetHierarchy ──────────────────────────────────────────────────────────

  describe("resetHierarchy", () => {
    it("sets currentShape to 'Regular' regardless of the previous shape", () => {
      const book = makeSectionBook({ currentShape: "ExplodedView" });
      book.resetHierarchy();
      expect(book.currentShape).toBe("Regular");
    });

    it("sets currentShape to 'Regular' when starting from undefined", () => {
      const book = makeSectionBook(); // no initial shape
      book.resetHierarchy();
      expect(book.currentShape).toBe("Regular");
    });

    it("sets currentShape to 'Regular' even when clearPiece=false", () => {
      const book = makeSectionBook({ currentShape: "Selected" });
      book.resetHierarchy(false);
      expect(book.currentShape).toBe("Regular");
    });

    it("resets selectionState to Idle", () => {
      const book = makeSectionBook();
      selectSectionBook(book);
      book.resetHierarchy();
      expect(book.selectionState).toBe(SelectionStates.Idle);
    });

    it("clears queuedChapterData", () => {
      const book = makeSectionBook();
      book.setQueuedChapterData(makeChapter());
      book.resetHierarchy();
      expect(book.queuedChapterData).toBeUndefined();
    });

    it("clears currentSelectedChapterData", () => {
      const book = makeSectionBook();
      book.setSelectedChapterData(makeChapter());
      book.resetHierarchy();
      expect(book.currentSelectedChapterData).toBeUndefined();
    });

    it("releases the piece and returns it when clearPiece=true (default)", () => {
      const piece = makeSectionPiece();
      const book = makeSectionBook({ piece });
      const released = book.resetHierarchy();
      expect(released).toContain(piece);
      expect(book.isPieceAvailable()).toBe(false);
    });

    it("does not release the piece when clearPiece=false", () => {
      const piece = makeSectionPiece();
      const book = makeSectionBook({ piece });
      const released = book.resetHierarchy(false);
      expect(released).not.toContain(piece);
      expect(book.isPieceAvailable()).toBe(true);
    });

    it("deactivates when a piece is present and clearPiece=true", () => {
      const book = makeSectionBook({
        piece: makeSectionPiece(),
        isActive: true,
      });
      book.resetHierarchy(true);
      expect(book.isActive).toBe(false);
    });

    it("does not deactivate when clearPiece=false, even if active", () => {
      const book = makeSectionBook({
        piece: makeSectionPiece(),
        isActive: true,
      });
      book.resetHierarchy(false);
      expect(book.isActive).toBe(true);
    });

    it("does not deactivate when no piece is attached", () => {
      const book = makeSectionBook({ isActive: true }); // no piece
      book.resetHierarchy(true);
      expect(book.isActive).toBe(true);
    });

    it("returns an empty array when there is no piece and no child pieces", () => {
      expect(makeSectionBook().resetHierarchy()).toEqual([]);
    });
  });
});
