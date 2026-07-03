import { StackBookBaseData } from "bibleVizUtils.domain.entities.StackBookBaseData";
import { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import {
  SelectionStates,
  SelectionEvents,
} from "bibleVizUtils.domain.models.selection";

// ─── minimal concrete subclass ───────────────────────────────────────────────

class TestBook extends StackBookBaseData<
  { name: string },
  { arrangementIndex: number; testamentIndex: number; sectionIndex: number },
  "StackBook"
> {}

// ─── factories ───────────────────────────────────────────────────────────────

const makeBookPiece = (id = "bp1") => ({ id, type: "StackBook" as const });

const makeBook = (overrides: any = {}) =>
  new TestBook({
    id: "test-book",
    type: "StackBook",
    pieceInfo: { name: "Genesis" },
    creationParams: { arrangementIndex: 0, testamentIndex: 0, sectionIndex: 0 },
    ...overrides,
  } as any);

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
const selectBook = (book: TestBook) => {
  book.changeSelectionState(SelectionEvents.RequestSelect); // Idle → Selecting
  book.changeSelectionState(SelectionEvents.SequenceComplete); // Selecting → Selected
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StackBookBaseData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
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

    it("defaults currentShape to undefined", () => {
      expect(makeBook().currentShape).toBeUndefined();
    });

    it("stores a provided initial shape", () => {
      expect(makeBook({ currentShape: "Regular" }).currentShape).toBe(
        "Regular"
      );
    });

    it("defaults isShowingChapters to false", () => {
      expect(makeBook().isShowingChapters).toBe(false);
    });

    it("defaults labelTranslucency to undefined", () => {
      expect(makeBook().labelTranslucency).toBeUndefined();
    });

    it("defaults queuedChapterData to undefined", () => {
      expect(makeBook().queuedChapterData).toBeUndefined();
    });

    it("defaults currentSelectedChapterData to undefined", () => {
      expect(makeBook().currentSelectedChapterData).toBeUndefined();
    });

    it("stores provided childrenData", () => {
      const ch = makeChapter();
      expect(makeBook({ childrenData: [ch] }).childrenData).toEqual([ch]);
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
    it("showChapters sets isShowingChapters to true", () => {
      const book = makeBook();
      book.showChapters();
      expect(book.isShowingChapters).toBe(true);
    });

    it("hideChapters sets isShowingChapters to false", () => {
      const book = makeBook();
      book.showChapters();
      book.hideChapters();
      expect(book.isShowingChapters).toBe(false);
    });

    it("hideChapters is idempotent when already false", () => {
      const book = makeBook();
      book.hideChapters();
      expect(book.isShowingChapters).toBe(false);
    });
  });

  // ─── labelTranslucency ───────────────────────────────────────────────────────

  describe("labelTranslucency / changeLabelTranslucency / clearLabelTranslucency", () => {
    it("changeLabelTranslucency stores the value", () => {
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
    it("changeShape stores the shape", () => {
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
      const book = makeBook({ currentShape: "RegularSelected" });
      book.clearShape();
      expect(book.currentShape).toBeUndefined();
    });

    it("clearShape is idempotent when already undefined", () => {
      const book = makeBook();
      book.clearShape();
      expect(book.currentShape).toBeUndefined();
    });
  });

  // ─── queuedChapterData ───────────────────────────────────────────────────────

  describe("queuedChapterData / setQueuedChapterData / clearQueuedChapterData", () => {
    it("setQueuedChapterData stores the chapter", () => {
      const book = makeBook();
      const chapter = makeChapter();
      book.setQueuedChapterData(chapter);
      expect(book.queuedChapterData).toBe(chapter);
    });

    it("setQueuedChapterData overwrites a previous queued chapter", () => {
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
    it("setSelectedChapterData stores the chapter", () => {
      const book = makeBook();
      const chapter = makeChapter();
      book.setSelectedChapterData(chapter);
      expect(book.currentSelectedChapterData).toBe(chapter);
    });

    it("setSelectedChapterData overwrites a previous value", () => {
      const book = makeBook();
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      book.setSelectedChapterData(ch1);
      book.setSelectedChapterData(ch2);
      expect(book.currentSelectedChapterData).toBe(ch2);
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

    it("returns false and leaves childrenData unchanged when chapter is not found", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(ch2, makeChapter())).toBe(false);
      expect(book.childrenData[0]).toBe(ch1);
    });

    it("uses reference equality to find the chapter to replace", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const lookalike = makeChapter({ id: "ch-1" }); // same id, different reference
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(lookalike, makeChapter())).toBe(false);
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

    it("preserves currentSelectedChapterData when the replacement fails", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1] });
      book.setSelectedChapterData(ch1);
      book.tryReplaceChild(ch2, makeChapter()); // ch2 not in children
      expect(book.currentSelectedChapterData).toBe(ch1);
    });
  });

  // ─── isChapterAvailable ──────────────────────────────────────────────────────

  describe("isChapterAvailable", () => {
    it("returns true for a chapter that exists and is not hidden", () => {
      expect(
        makeBook({ childrenData: [makeChapter()] }).isChapterAvailable(1)
      ).toBe(true);
    });

    it("returns false when the chapter number is out of range", () => {
      expect(makeBook({ childrenData: [] }).isChapterAvailable(1)).toBe(false);
    });

    it("returns false for a hidden chapter", () => {
      expect(
        makeBook({
          childrenData: [makeChapter({ isHidden: true })],
        }).isChapterAvailable(1)
      ).toBe(false);
    });

    it("uses 1-based indexing: chapter 1 maps to childrenData[0]", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2", isHidden: true });
      const book = makeBook({ childrenData: [ch1, ch2] });
      expect(book.isChapterAvailable(1)).toBe(true);
      expect(book.isChapterAvailable(2)).toBe(false);
    });
  });

  // ─── resetHierarchy ──────────────────────────────────────────────────────────

  describe("resetHierarchy", () => {
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

    it("releases the piece when clearPiece=true (default)", () => {
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

    it("does NOT clear the current shape (shape management is a subclass responsibility)", () => {
      const book = makeBook({ currentShape: "ExplodedView" });
      book.resetHierarchy();
      expect(book.currentShape).toBe("ExplodedView");
    });

    it("deactivates when a piece is present and clearPiece=true", () => {
      const book = makeBook({ piece: makeBookPiece(), isActive: true });
      book.resetHierarchy(true);
      expect(book.isActive).toBe(false);
    });

    it("does not deactivate when clearPiece=false, even if active", () => {
      const book = makeBook({ piece: makeBookPiece(), isActive: true });
      book.resetHierarchy(false);
      expect(book.isActive).toBe(true);
    });

    it("does not deactivate when no piece is attached and clearPiece=true", () => {
      const book = makeBook({ isActive: true }); // no piece
      book.resetHierarchy(true);
      expect(book.isActive).toBe(true);
    });

    it("returns an empty array when there is no piece and no child pieces", () => {
      expect(makeBook().resetHierarchy()).toEqual([]);
    });
  });
});
