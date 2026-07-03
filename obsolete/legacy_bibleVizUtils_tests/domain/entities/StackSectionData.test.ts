import { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import {
  SelectionStates,
  SelectionEvents,
} from "bibleVizUtils.domain.models.selection";

// ─── factories ───────────────────────────────────────────────────────────────

const makeSectionCreationParams = (overrides: any = {}) => ({
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  amountOfChaptersInSection: 10,
  ...overrides,
});

const makeBookCreationParams = (overrides: any = {}) => ({
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  levelIndex: 0,
  bookIndex: 0,
  bookLevelIndex: 0,
  levelsLenght: 1,
  ...overrides,
});

const makeSectionPiece = (id = "sp1") => ({
  id,
  type: "StackSection" as const,
});

const makeShadowPiece = (id = "sh1") => ({
  id,
  type: "StackSectionShadow" as const,
});

const makeBookPiece = (id = "bp1") => ({ id, type: "StackBook" as const });

const makeBook = (overrides: any = {}) =>
  new StackBookData({
    id: "book-1",
    pieceInfo: { name: "Genesis" } as any,
    creationParams: makeBookCreationParams(),
    ...overrides,
  });

const makeSection = (overrides: any = {}) =>
  new StackSectionData({
    id: "section-1",
    pieceInfo: { name: "Section 1" } as any,
    parentDataIds: {} as any,
    creationParams: makeSectionCreationParams(),
    ...overrides,
  });

// Advances a book (standardSelectionFSM) all the way to Selected state.
const selectBook = (book: StackBookData) => {
  book.changeSelectionState(SelectionEvents.RequestSelect); // → Selecting
  book.changeSelectionState(SelectionEvents.SequenceComplete); // → Selected
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StackSectionData", () => {
  // ─── constructor ────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("defaults isSplitIntoBooks to false", () => {
      expect(makeSection().isSplitIntoBooks).toBe(false);
    });

    it("sets isSplitIntoBooks to true when isSplitIntoBooks=true (simpleSelectionFSM)", () => {
      expect(makeSection({ isSplitIntoBooks: true }).isSplitIntoBooks).toBe(
        true
      );
    });

    it("defaults isInExplodedView to false", () => {
      expect(makeSection().isInExplodedView).toBe(false);
    });

    it("defaults isInsideTestament to true", () => {
      expect(makeSection().isInsideTestament).toBe(true);
    });

    it("defaults isActive to false", () => {
      expect(makeSection().isActive).toBe(false);
    });

    it("starts with selectionState Idle when not split", () => {
      expect(makeSection().selectionState).toBe(SelectionStates.Idle);
    });

    it("starts with selectionState Selected when split (simpleSelectionFSM)", () => {
      expect(makeSection({ isSplitIntoBooks: true }).selectionState).toBe(
        SelectionStates.Selected
      );
    });
  });

  // ─── isSplitIntoBooks ───────────────────────────────────────────────────────

  describe("isSplitIntoBooks", () => {
    it("is false when selectionState is Idle", () => {
      expect(makeSection().isSplitIntoBooks).toBe(false);
    });

    it("is true after requesting selection via FSM", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect);
      expect(section.isSplitIntoBooks).toBe(true);
    });

    it("is false after deselecting", () => {
      const section = makeSection({ isSplitIntoBooks: true });
      section.changeSelectionState(SelectionEvents.RequestDeselect);
      expect(section.isSplitIntoBooks).toBe(false);
    });
  });

  // ─── isInExplodedView / explode / implode ───────────────────────────────────

  describe("isInExplodedView", () => {
    it("defaults to false", () => {
      expect(makeSection().isInExplodedView).toBe(false);
    });

    it("explode() sets isInExplodedView to true", () => {
      const section = makeSection();
      section.explode();
      expect(section.isInExplodedView).toBe(true);
    });

    it("implode() sets isInExplodedView to false", () => {
      const section = makeSection();
      section.explode();
      section.implode();
      expect(section.isInExplodedView).toBe(false);
    });
  });

  // ─── isInsideTestament / attachToTestament / detachFromTestament ─────────────

  describe("isInsideTestament", () => {
    it("defaults to true", () => {
      expect(makeSection().isInsideTestament).toBe(true);
    });

    it("detachFromTestament sets isInsideTestament to false", () => {
      const section = makeSection();
      section.detachFromTestament();
      expect(section.isInsideTestament).toBe(false);
    });

    it("attachToTestament sets isInsideTestament to true", () => {
      const section = makeSection();
      section.detachFromTestament();
      section.attachToTestament();
      expect(section.isInsideTestament).toBe(true);
    });
  });

  // ─── shadow / attachShadow / detachShadow ───────────────────────────────────

  describe("shadow", () => {
    it("is undefined by default", () => {
      expect(makeSection().shadow).toBeUndefined();
    });

    it("attachShadow stores the shadow piece", () => {
      const section = makeSection();
      const shadow = makeShadowPiece();
      section.attachShadow(shadow);
      expect(section.shadow).toBe(shadow);
    });

    it("detachShadow returns the shadow and clears it", () => {
      const section = makeSection();
      const shadow = makeShadowPiece();
      section.attachShadow(shadow);
      const returned = section.detachShadow();
      expect(returned).toBe(shadow);
      expect(section.shadow).toBeUndefined();
    });

    it("detachShadow returns undefined when no shadow is attached", () => {
      expect(makeSection().detachShadow()).toBeUndefined();
    });
  });

  // ─── tryReplaceBook ─────────────────────────────────────────────────────────

  describe("tryReplaceBook", () => {
    it("returns true and replaces the book within its group", () => {
      const book = makeBook({ id: "b1" });
      const replacement = makeBook({ id: "b2" });
      const section = makeSection({ childrenData: [[book]] });

      const result = section.tryReplaceBook(book, replacement);

      expect(result).toBe(true);
      expect(section.childrenData.flat()).toContain(replacement);
      expect(section.childrenData.flat()).not.toContain(book);
    });

    it("returns false when the book is not found in any group", () => {
      const book = makeBook({ id: "b1" });
      const other = makeBook({ id: "b2" });
      const section = makeSection({ childrenData: [[book]] });

      expect(section.tryReplaceBook(other, makeBook({ id: "bX" }))).toBe(false);
    });

    it("does not mutate childrenData when the book is not found", () => {
      const book = makeBook({ id: "b1" });
      const section = makeSection({ childrenData: [[book]] });

      section.tryReplaceBook(makeBook({ id: "bX" }), makeBook({ id: "bY" }));

      expect(section.childrenData.flat()).toEqual([book]);
    });

    it("searches across multiple book groups", () => {
      const b1 = makeBook({ id: "b1" });
      const b2 = makeBook({ id: "b2" });
      const replacement = makeBook({ id: "bR" });
      const section = makeSection({ childrenData: [[b1], [b2]] });

      const result = section.tryReplaceBook(b2, replacement);

      expect(result).toBe(true);
      expect(section.childrenData.flat()).toContain(replacement);
    });

    it("uses reference equality to find the book", () => {
      const book = makeBook({ id: "b1" });
      const lookalike = makeBook({ id: "b1" }); // same id, different reference
      const section = makeSection({ childrenData: [[book]] });

      expect(section.tryReplaceBook(lookalike, makeBook({ id: "bR" }))).toBe(
        false
      );
    });
  });

  // ─── creationParams index getters ───────────────────────────────────────────

  describe("getArrangementIndex", () => {
    it("returns the arrangementIndex from creationParams", () => {
      const section = makeSection({
        creationParams: makeSectionCreationParams({ arrangementIndex: 2 }),
      });
      expect(section.getArrangementIndex()).toBe(2);
    });
  });

  describe("getTestamentIndex", () => {
    it("returns the testamentIndex from creationParams", () => {
      const section = makeSection({
        creationParams: makeSectionCreationParams({ testamentIndex: 1 }),
      });
      expect(section.getTestamentIndex()).toBe(1);
    });
  });

  describe("getSectionIndex", () => {
    it("returns the sectionIndex from creationParams", () => {
      const section = makeSection({
        creationParams: makeSectionCreationParams({ sectionIndex: 4 }),
      });
      expect(section.getSectionIndex()).toBe(4);
    });
  });

  // ─── resetHierarchy ─────────────────────────────────────────────────────────

  describe("resetHierarchy", () => {
    it("sets isInExplodedView to false", () => {
      const section = makeSection();
      section.explode();
      section.resetHierarchy();
      expect(section.isInExplodedView).toBe(false);
    });

    it("resets selectionState to Idle", () => {
      const section = makeSection({ isSplitIntoBooks: true });
      section.resetHierarchy();
      expect(section.selectionState).toBe(SelectionStates.Idle);
    });

    it("detaches and releases the shadow piece", () => {
      const section = makeSection();
      const shadow = makeShadowPiece();
      section.attachShadow(shadow);
      const released = section.resetHierarchy();
      expect(released).toContain(shadow);
      expect(section.shadow).toBeUndefined();
    });

    it("releases own piece when clearPiece is true (default)", () => {
      const piece = makeSectionPiece();
      const section = makeSection();
      section.setPiece(piece);
      const released = section.resetHierarchy();
      expect(released).toContain(piece);
      expect(section.piece).toBeUndefined();
    });

    it("does not release own piece when clearPiece is false", () => {
      const piece = makeSectionPiece();
      const section = makeSection();
      section.setPiece(piece);
      const released = section.resetHierarchy(false);
      expect(released).not.toContain(piece);
      expect(section.piece).toBe(piece);
    });

    it("returns an empty array when there is nothing to release", () => {
      expect(makeSection().resetHierarchy()).toEqual([]);
    });
  });

  // ─── tryExplode ─────────────────────────────────────────────────────────────

  describe("tryExplode", () => {
    it("returns false when selectionState is Idle", () => {
      expect(makeSection().tryExplode()).toBe(false);
    });

    it("returns true and sets isInExplodedView when selectionState is not Idle", () => {
      const section = makeSection({ isSplitIntoBooks: true });
      const result = section.tryExplode();
      expect(result).toBe(true);
      expect(section.isInExplodedView).toBe(true);
    });

    it("returns false when already in exploded view", () => {
      const section = makeSection({
        isSplitIntoBooks: true,
        isInExplodedView: true,
      });
      expect(section.tryExplode()).toBe(false);
    });
  });

  // ─── isExplodable ───────────────────────────────────────────────────────────

  describe("isExplodable", () => {
    it("returns false when selectionState is Idle", () => {
      expect(makeSection().isExplodable()).toBe(false);
    });

    it("returns true when selectionState is not Idle and not exploded", () => {
      const section = makeSection({ isSplitIntoBooks: true });
      expect(section.isExplodable()).toBe(true);
    });

    it("returns false when already in exploded view", () => {
      const section = makeSection({
        isSplitIntoBooks: true,
        isInExplodedView: true,
      });
      expect(section.isExplodable()).toBe(false);
    });
  });

  // ─── isSelectable ───────────────────────────────────────────────────────────

  describe("isSelectable", () => {
    it("returns true when selectionState is Idle", () => {
      expect(makeSection().isSelectable()).toBe(true);
    });

    it("returns false when selectionState is not Idle", () => {
      const section = makeSection({ isSplitIntoBooks: true });
      expect(section.isSelectable()).toBe(false);
    });
  });

  // ─── getActivelySelectedBooks ───────────────────────────────────────────────

  describe("getActivelySelectedBooks", () => {
    it("returns an empty array when there are no books", () => {
      expect(makeSection().getActivelySelectedBooks()).toEqual([]);
    });

    it("includes books that are both active and in Selected state", () => {
      const book = makeBook();
      book.activate();
      selectBook(book);
      const section = makeSection({ childrenData: [[book]] });
      expect(section.getActivelySelectedBooks()).toContain(book);
    });

    it("excludes books that are active but not Selected", () => {
      const book = makeBook({ isActive: true });
      // selectionState stays Idle
      const section = makeSection({ childrenData: [[book]] });
      expect(section.getActivelySelectedBooks()).not.toContain(book);
    });

    it("excludes books that are Selected but not active", () => {
      const book = makeBook();
      selectBook(book);
      // isActive stays false
      const section = makeSection({ childrenData: [[book]] });
      expect(section.getActivelySelectedBooks()).not.toContain(book);
    });

    it("searches across all book groups", () => {
      const b1 = makeBook({ id: "b1" });
      const b2 = makeBook({ id: "b2" });
      b1.activate();
      selectBook(b1);
      b2.activate();
      selectBook(b2);
      const section = makeSection({ childrenData: [[b1], [b2]] });
      const result = section.getActivelySelectedBooks();
      expect(result).toContain(b1);
      expect(result).toContain(b2);
    });
  });

  // ─── clearChildrenPieces ────────────────────────────────────────────────────

  describe("clearChildrenPieces", () => {
    it("returns an empty array when no books have pieces", () => {
      const section = makeSection({ childrenData: [[makeBook()]] });
      expect(section.clearChildrenPieces()).toEqual([]);
    });

    it("returns the pieces from books that have them", () => {
      const book = makeBook();
      const piece = makeBookPiece();
      book.setPiece(piece);
      const section = makeSection({ childrenData: [[book]] });
      expect(section.clearChildrenPieces()).toContain(piece);
    });

    it("clears pieces from books after collecting them", () => {
      const book = makeBook();
      book.setPiece(makeBookPiece());
      const section = makeSection({ childrenData: [[book]] });
      section.clearChildrenPieces();
      expect(book.piece).toBeUndefined();
    });

    it("only includes books that had pieces, not those without", () => {
      const withPiece = makeBook({ id: "b1" });
      const withoutPiece = makeBook({ id: "b2" });
      const piece = makeBookPiece();
      withPiece.setPiece(piece);
      const section = makeSection({
        childrenData: [[withPiece, withoutPiece]],
      });
      const result = section.clearChildrenPieces();
      expect(result).toHaveLength(1);
      expect(result).toContain(piece);
    });

    it("collects pieces across multiple book groups", () => {
      const b1 = makeBook({ id: "b1" });
      const b2 = makeBook({ id: "b2" });
      const p1 = makeBookPiece("bp1");
      const p2 = makeBookPiece("bp2");
      b1.setPiece(p1);
      b2.setPiece(p2);
      const section = makeSection({ childrenData: [[b1], [b2]] });
      const result = section.clearChildrenPieces();
      expect(result).toContain(p1);
      expect(result).toContain(p2);
    });
  });

  // ─── findBookByPieceInfoProperty ────────────────────────────────────────────

  describe("findBookByPieceInfoProperty", () => {
    it("returns undefined when no books are present", () => {
      expect(
        makeSection().findBookByPieceInfoProperty(
          "name" as any,
          "Genesis" as any
        )
      ).toBeUndefined();
    });

    it("returns the book matching the property value", () => {
      const book = makeBook({ pieceInfo: { name: "Exodus" } as any });
      const section = makeSection({ childrenData: [[book]] });
      expect(
        section.findBookByPieceInfoProperty("name" as any, "Exodus" as any)
      ).toBe(book);
    });

    it("returns undefined when no book matches", () => {
      const book = makeBook({ pieceInfo: { name: "Genesis" } as any });
      const section = makeSection({ childrenData: [[book]] });
      expect(
        section.findBookByPieceInfoProperty("name" as any, "Exodus" as any)
      ).toBeUndefined();
    });

    it("searches across all book groups", () => {
      const b1 = makeBook({ id: "b1", pieceInfo: { name: "Genesis" } as any });
      const b2 = makeBook({ id: "b2", pieceInfo: { name: "Exodus" } as any });
      const section = makeSection({ childrenData: [[b1], [b2]] });
      expect(
        section.findBookByPieceInfoProperty("name" as any, "Exodus" as any)
      ).toBe(b2);
    });
  });

  // ─── getActiveBooks ─────────────────────────────────────────────────────────

  describe("getActiveBooks", () => {
    it("returns an empty array when no books are active", () => {
      const section = makeSection({ childrenData: [[makeBook()]] });
      expect(section.getActiveBooks()).toEqual([]);
    });

    it("returns books where isActive is true", () => {
      const book = makeBook({ isActive: true });
      const section = makeSection({ childrenData: [[book]] });
      expect(section.getActiveBooks()).toContain(book);
    });

    it("excludes inactive books", () => {
      const active = makeBook({ id: "b1", isActive: true });
      const inactive = makeBook({ id: "b2" });
      const section = makeSection({ childrenData: [[active, inactive]] });
      const result = section.getActiveBooks();
      expect(result).toContain(active);
      expect(result).not.toContain(inactive);
    });

    it("collects active books from all book groups", () => {
      const b1 = makeBook({ id: "b1", isActive: true });
      const b2 = makeBook({ id: "b2", isActive: true });
      const section = makeSection({ childrenData: [[b1], [b2]] });
      const result = section.getActiveBooks();
      expect(result).toContain(b1);
      expect(result).toContain(b2);
    });
  });

  // ─── getActiveBookPieces ────────────────────────────────────────────────────

  describe("getActiveBookPieces", () => {
    it("returns an empty array when no books are active", () => {
      const section = makeSection({ childrenData: [[makeBook()]] });
      expect(section.getActiveBookPieces()).toEqual([]);
    });

    it("returns pieces from books that are active and have a piece", () => {
      const book = makeBook({ isActive: true });
      const piece = makeBookPiece();
      book.setPiece(piece);
      const section = makeSection({ childrenData: [[book]] });
      expect(section.getActiveBookPieces()).toContain(piece);
    });

    it("excludes active books that have no piece", () => {
      const book = makeBook({ isActive: true });
      // no piece set
      const section = makeSection({ childrenData: [[book]] });
      expect(section.getActiveBookPieces()).toEqual([]);
    });

    it("excludes inactive books even if they have a piece", () => {
      const book = makeBook();
      book.setPiece(makeBookPiece());
      const section = makeSection({ childrenData: [[book]] });
      expect(section.getActiveBookPieces()).toEqual([]);
    });

    it("collects pieces across all book groups", () => {
      const b1 = makeBook({ id: "b1", isActive: true });
      const b2 = makeBook({ id: "b2", isActive: true });
      const p1 = makeBookPiece("bp1");
      const p2 = makeBookPiece("bp2");
      b1.setPiece(p1);
      b2.setPiece(p2);
      const section = makeSection({ childrenData: [[b1], [b2]] });
      const result = section.getActiveBookPieces();
      expect(result).toContain(p1);
      expect(result).toContain(p2);
    });
  });
});
