import { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
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
  levelIndex: 0,
  bookIndex: 0,
  bookLevelIndex: 0,
  levelsLenght: 1,
  ...overrides,
});

const makeBookPiece = (id = "bp1") => ({ id, type: "StackBook" as const });

const makeBook = (overrides: any = {}) =>
  new StackBookData({
    id: "book-1",
    pieceInfo: { bookId: "gen", type: "complete" } as any,
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
const selectBook = (book: StackBookData) => {
  book.changeSelectionState(SelectionEvents.RequestSelect); // → Selecting
  book.changeSelectionState(SelectionEvents.SequenceComplete); // → Selected
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StackBookData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("defaults isInsideSection to true", () => {
      expect(makeBook().isInsideSection).toBe(true);
    });

    it("stores isInsideSection=false when provided", () => {
      expect(makeBook({ isInsideSection: false }).isInsideSection).toBe(false);
    });

    it("defaults isInsideTestament to true", () => {
      expect(makeBook().isInsideTestament).toBe(true);
    });

    it("stores isInsideTestament=false when provided", () => {
      expect(makeBook({ isInsideTestament: false }).isInsideTestament).toBe(
        false
      );
    });

    it("defaults isActive to false", () => {
      expect(makeBook().isActive).toBe(false);
    });

    it("defaults selectionState to Idle", () => {
      expect(makeBook().selectionState).toBe(SelectionStates.Idle);
    });

    it("when isSelected=true, advances selectionState to Selecting (standardSelectionFSM first step)", () => {
      expect(makeBook({ isSelected: true }).selectionState).toBe(
        SelectionStates.Selecting
      );
    });

    it("stores the provided childrenData", () => {
      const ch = makeChapter();
      expect(makeBook({ childrenData: [ch] }).childrenData).toEqual([ch]);
    });
  });

  // ─── isInsideSection ─────────────────────────────────────────────────────────

  describe("isInsideSection / attachToSection / detachFromSection", () => {
    it("attachToSection sets isInsideSection to true", () => {
      const book = makeBook({ isInsideSection: false });
      book.attachToSection();
      expect(book.isInsideSection).toBe(true);
    });

    it("detachFromSection sets isInsideSection to false", () => {
      const book = makeBook();
      book.detachFromSection();
      expect(book.isInsideSection).toBe(false);
    });
  });

  // ─── isInsideTestament ───────────────────────────────────────────────────────

  describe("isInsideTestament / attachToTestament / detachFromTestament", () => {
    it("attachToTestament sets isInsideTestament to true", () => {
      const book = makeBook({ isInsideTestament: false });
      book.attachToTestament();
      expect(book.isInsideTestament).toBe(true);
    });

    it("detachFromTestament sets isInsideTestament to false", () => {
      const book = makeBook();
      book.detachFromTestament();
      expect(book.isInsideTestament).toBe(false);
    });
  });

  // ─── isShowingChapters ───────────────────────────────────────────────────────

  describe("isShowingChapters / showChapters / hideChapters", () => {
    it("defaults isShowingChapters to false", () => {
      expect(makeBook().isShowingChapters).toBe(false);
    });

    it("showChapters sets isShowingChapters to true", () => {
      const book = makeBook();
      book.showChapters();
      expect(book.isShowingChapters).toBe(true);
    });

    it("hideChapters sets isShowingChapters to false after showChapters", () => {
      const book = makeBook();
      book.showChapters();
      book.hideChapters();
      expect(book.isShowingChapters).toBe(false);
    });
  });

  // ─── labelTranslucency ───────────────────────────────────────────────────────

  describe("labelTranslucency / changeLabelTranslucency / clearLabelTranslucency", () => {
    it("defaults labelTranslucency to undefined", () => {
      expect(makeBook().labelTranslucency).toBeUndefined();
    });

    it("changeLabelTranslucency stores the new value", () => {
      const book = makeBook();
      book.changeLabelTranslucency("Faded");
      expect(book.labelTranslucency).toBe("Faded");
    });

    it("changeLabelTranslucency overwrites the previous value", () => {
      const book = makeBook();
      book.changeLabelTranslucency("Faded");
      book.changeLabelTranslucency("Solid");
      expect(book.labelTranslucency).toBe("Solid");
    });

    it("clearLabelTranslucency resets to undefined", () => {
      const book = makeBook();
      book.changeLabelTranslucency("Solid");
      book.clearLabelTranslucency();
      expect(book.labelTranslucency).toBeUndefined();
    });
  });

  // ─── currentShape ────────────────────────────────────────────────────────────

  describe("currentShape / changeShape / clearShape", () => {
    it("defaults currentShape to undefined", () => {
      expect(makeBook().currentShape).toBeUndefined();
    });

    it("stores the provided initial shape", () => {
      expect(makeBook({ currentShape: "Regular" }).currentShape).toBe(
        "Regular"
      );
    });

    it("changeShape stores the new shape", () => {
      const book = makeBook();
      book.changeShape("ExplodedView");
      expect(book.currentShape).toBe("ExplodedView");
    });

    it("changeShape overwrites the previous shape", () => {
      const book = makeBook({ currentShape: "Regular" });
      book.changeShape("Selected");
      expect(book.currentShape).toBe("Selected");
    });

    it("clearShape resets to undefined", () => {
      const book = makeBook({ currentShape: "Selected" });
      book.clearShape();
      expect(book.currentShape).toBeUndefined();
    });
  });

  // ─── queuedChapterData ───────────────────────────────────────────────────────

  describe("queuedChapterData / setQueuedChapterData / clearQueuedChapterData", () => {
    it("defaults queuedChapterData to undefined", () => {
      expect(makeBook().queuedChapterData).toBeUndefined();
    });

    it("setQueuedChapterData stores the chapter", () => {
      const book = makeBook();
      const chapter = makeChapter();
      book.setQueuedChapterData(chapter);
      expect(book.queuedChapterData).toBe(chapter);
    });

    it("setQueuedChapterData overwrites a previous value", () => {
      const book = makeBook();
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      book.setQueuedChapterData(ch1);
      book.setQueuedChapterData(ch2);
      expect(book.queuedChapterData).toBe(ch2);
    });

    it("clearQueuedChapterData resets to undefined", () => {
      const book = makeBook();
      book.setQueuedChapterData(makeChapter());
      book.clearQueuedChapterData();
      expect(book.queuedChapterData).toBeUndefined();
    });
  });

  // ─── currentSelectedChapterData ──────────────────────────────────────────────

  describe("currentSelectedChapterData / setSelectedChapterData / clearSelectedChapterData", () => {
    it("defaults currentSelectedChapterData to undefined", () => {
      expect(makeBook().currentSelectedChapterData).toBeUndefined();
    });

    it("setSelectedChapterData stores the chapter", () => {
      const book = makeBook();
      const chapter = makeChapter();
      book.setSelectedChapterData(chapter);
      expect(book.currentSelectedChapterData).toBe(chapter);
    });

    it("clearSelectedChapterData resets to undefined", () => {
      const book = makeBook();
      book.setSelectedChapterData(makeChapter());
      book.clearSelectedChapterData();
      expect(book.currentSelectedChapterData).toBeUndefined();
    });
  });

  // ─── tryReplaceChild ─────────────────────────────────────────────────────────

  describe("tryReplaceChild", () => {
    it("replaces the matching chapter in childrenData and returns true", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(ch1, ch2)).toBe(true);
      expect(book.childrenData[0]).toBe(ch2);
    });

    it("returns false when the chapter is not in childrenData", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(ch2, makeChapter())).toBe(false);
    });

    it("clears currentSelectedChapterData when the replaced chapter was the selected one", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1] });
      book.setSelectedChapterData(ch1);
      book.tryReplaceChild(ch1, ch2);
      expect(book.currentSelectedChapterData).toBeUndefined();
    });

    it("preserves currentSelectedChapterData when a different chapter is replaced", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const ch3 = makeChapter({ id: "ch-3" });
      const book = makeBook({ childrenData: [ch1, ch2] });
      book.setSelectedChapterData(ch1);
      book.tryReplaceChild(ch2, ch3);
      expect(book.currentSelectedChapterData).toBe(ch1);
    });

    it("uses reference equality to identify the chapter to replace", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const lookalike = makeChapter({ id: "ch-1" });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(lookalike, makeChapter())).toBe(false);
      expect(book.childrenData[0]).toBe(ch1);
    });
  });

  // ─── isChapterAvailable ──────────────────────────────────────────────────────

  describe("isChapterAvailable", () => {
    it("returns true for a chapter that exists and is not hidden", () => {
      const book = makeBook({ childrenData: [makeChapter()] });
      expect(book.isChapterAvailable(1)).toBe(true);
    });

    it("returns false when the chapter number is out of range", () => {
      expect(makeBook({ childrenData: [] }).isChapterAvailable(1)).toBe(false);
    });

    it("returns false for a hidden chapter", () => {
      const book = makeBook({
        childrenData: [makeChapter({ isHidden: true })],
      });
      expect(book.isChapterAvailable(1)).toBe(false);
    });

    it("uses 1-based indexing (chapter 1 maps to index 0)", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2", isHidden: true });
      const book = makeBook({ childrenData: [ch1, ch2] });
      expect(book.isChapterAvailable(1)).toBe(true);
      expect(book.isChapterAvailable(2)).toBe(false);
    });
  });

  // ─── index getters ───────────────────────────────────────────────────────────

  describe("index getters", () => {
    it("getArrangementIndex returns arrangementIndex from creationParams", () => {
      expect(
        makeBook({
          creationParams: makeCreationParams({ arrangementIndex: 3 }),
        }).getArrangementIndex()
      ).toBe(3);
    });

    it("getTestamentIndex returns testamentIndex from creationParams", () => {
      expect(
        makeBook({
          creationParams: makeCreationParams({ testamentIndex: 1 }),
        }).getTestamentIndex()
      ).toBe(1);
    });

    it("getSectionIndex returns sectionIndex from creationParams", () => {
      expect(
        makeBook({
          creationParams: makeCreationParams({ sectionIndex: 2 }),
        }).getSectionIndex()
      ).toBe(2);
    });

    it("getLevelIndex returns levelIndex from creationParams", () => {
      expect(
        makeBook({
          creationParams: makeCreationParams({ levelIndex: 4 }),
        }).getLevelIndex()
      ).toBe(4);
    });

    it("getBookIndex returns bookIndex from creationParams", () => {
      expect(
        makeBook({
          creationParams: makeCreationParams({ bookIndex: 5 }),
        }).getBookIndex()
      ).toBe(5);
    });

    it("getBookLevelIndex returns bookLevelIndex from creationParams", () => {
      expect(
        makeBook({
          creationParams: makeCreationParams({ bookLevelIndex: 6 }),
        }).getBookLevelIndex()
      ).toBe(6);
    });

    it("getLevelsLength returns levelsLenght from creationParams", () => {
      expect(
        makeBook({
          creationParams: makeCreationParams({ levelsLenght: 7 }),
        }).getLevelsLength()
      ).toBe(7);
    });
  });

  // ─── isActivelySelected ──────────────────────────────────────────────────────

  describe("isActivelySelected", () => {
    it("returns false when not active and not selected", () => {
      expect(makeBook().isActivelySelected()).toBe(false);
    });

    it("returns false when active but not in Selected state", () => {
      expect(makeBook({ isActive: true }).isActivelySelected()).toBe(false);
    });

    it("returns false when in Selected state but not active", () => {
      const book = makeBook();
      selectBook(book);
      expect(book.isActivelySelected()).toBe(false);
    });

    it("returns true when both active and in Selected state", () => {
      const book = makeBook({ isActive: true });
      selectBook(book);
      expect(book.isActivelySelected()).toBe(true);
    });

    it("returns false once deactivated, even if still Selected", () => {
      const book = makeBook({ isActive: true });
      selectBook(book);
      book.deactivate();
      expect(book.isActivelySelected()).toBe(false);
    });
  });

  // ─── resetHierarchy ──────────────────────────────────────────────────────────

  describe("resetHierarchy", () => {
    it("clears the current shape", () => {
      const book = makeBook({ currentShape: "ExplodedView" });
      book.resetHierarchy();
      expect(book.currentShape).toBeUndefined();
    });

    it("deactivates the book", () => {
      const book = makeBook({ isActive: true });
      book.resetHierarchy();
      expect(book.isActive).toBe(false);
    });

    it("resets selectionState to Idle", () => {
      const book = makeBook();
      selectBook(book);
      book.resetHierarchy();
      expect(book.selectionState).toBe(SelectionStates.Idle);
    });

    it("clears queuedChapterData", () => {
      const book = makeBook();
      book.setQueuedChapterData(makeChapter());
      book.resetHierarchy();
      expect(book.queuedChapterData).toBeUndefined();
    });

    it("clears currentSelectedChapterData", () => {
      const book = makeBook();
      book.setSelectedChapterData(makeChapter());
      book.resetHierarchy();
      expect(book.currentSelectedChapterData).toBeUndefined();
    });

    it("releases the piece when clearPiece=true (default) and returns it", () => {
      const piece = makeBookPiece();
      const book = makeBook({ piece });
      const released = book.resetHierarchy();
      expect(released).toContain(piece);
      expect(book.isPieceAvailable()).toBe(false);
    });

    it("does not release the piece when clearPiece=false", () => {
      const piece = makeBookPiece();
      const book = makeBook({ piece });
      const released = book.resetHierarchy(false);
      expect(released).not.toContain(piece);
      expect(book.isPieceAvailable()).toBe(true);
    });

    it("deactivates even when clearPiece=false", () => {
      const piece = makeBookPiece();
      const book = makeBook({ piece, isActive: true });
      book.resetHierarchy(false);
      expect(book.isActive).toBe(false);
    });
  });

  // ─── findChapterByPieceInfoProperty ──────────────────────────────────────────

  describe("findChapterByPieceInfoProperty", () => {
    it("returns the chapter matching the given pieceInfo property value", () => {
      const ch1 = makeChapter({
        id: "ch-1",
        pieceInfo: { number: 1, amountOfVerses: 31 },
      });
      const ch2 = makeChapter({
        id: "ch-2",
        pieceInfo: { number: 2, amountOfVerses: 40 },
      });
      const book = makeBook({ childrenData: [ch1, ch2] });
      expect(book.findChapterByPieceInfoProperty("number", 2)).toBe(ch2);
    });

    it("returns undefined when no chapter matches", () => {
      const ch1 = makeChapter({
        id: "ch-1",
        pieceInfo: { number: 1, amountOfVerses: 31 },
      });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.findChapterByPieceInfoProperty("number", 99)).toBeUndefined();
    });

    it("returns the first match when multiple chapters share the property value", () => {
      const ch1 = makeChapter({
        id: "ch-1",
        pieceInfo: { number: 1, amountOfVerses: 10 },
      });
      const ch2 = makeChapter({
        id: "ch-2",
        pieceInfo: { number: 2, amountOfVerses: 10 },
      });
      const book = makeBook({ childrenData: [ch1, ch2] });
      expect(book.findChapterByPieceInfoProperty("amountOfVerses", 10)).toBe(
        ch1
      );
    });

    it("returns undefined when childrenData is empty", () => {
      expect(
        makeBook({ childrenData: [] }).findChapterByPieceInfoProperty(
          "number",
          1
        )
      ).toBeUndefined();
    });
  });
});
