import { LayoutBookData } from "bibleVizUtils.domain.entities.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.domain.entities.LayoutChapterData";
import type { ActivityIndicator } from "bibleVizUtils.domain.models.canvas";

// ─── factories ───────────────────────────────────────────────────────────────

const makePiece = (id = "p1") => ({ id, type: "LayoutBook" as const });

const makeIndicator = (id = "i1", index = 0): ActivityIndicator => ({
  id,
  type: "ActivityIndicator",
  indicatorType: "regular",
  index,
});

const makeBookInfo = (overrides: any = {}): any => ({
  bookId: "gen",
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
  ...overrides,
});

const makeParentIds = (partial: any = {}) => ({
  stackBibleId: undefined,
  stackTestamentId: undefined,
  stackSectionId: undefined,
  stackBookId: undefined,
  stackSectionBookId: undefined,
  layoutId: undefined,
  layoutBookId: undefined,
  ...partial,
});

const makeCreationParams = (overrides: any = {}): any => ({
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  ...overrides,
});

const makeChapter = (overrides: any = {}) =>
  new LayoutChapterData({
    id: "chapter-1",
    pieceInfo: { amountOfVerses: 31, number: 1 },
    parentDataIds: makeParentIds(),
    originalLayoutId: undefined,
    creationParams: { bookId: "gen" },
    ...overrides,
  });

const makeBook = (overrides: any = {}) =>
  new LayoutBookData({
    id: "book-1",
    pieceInfo: makeBookInfo(),
    parentDataIds: makeParentIds(),
    creationParams: makeCreationParams(),
    childrenData: [],
    ...overrides,
  });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("LayoutBookData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the id", () => {
      expect(makeBook({ id: "book-42" }).id).toBe("book-42");
    });

    it("stores pieceInfo by reference", () => {
      const info = makeBookInfo({ bookId: "exo" });
      expect(makeBook({ pieceInfo: info }).pieceInfo).toBe(info);
    });

    it("stores creationParams", () => {
      const params = makeCreationParams({ arrangementIndex: 3 });
      expect(makeBook({ creationParams: params }).creationParams).toBe(params);
    });

    it("defaults isSelected to false", () => {
      expect(makeBook().isSelected).toBe(false);
    });

    it("stores isSelected=true when provided", () => {
      expect(makeBook({ isSelected: true }).isSelected).toBe(true);
    });

    it("defaults isActive to false", () => {
      expect(makeBook().isActive).toBe(false);
    });

    it("stores isActive=true when provided", () => {
      expect(makeBook({ isActive: true }).isActive).toBe(true);
    });

    it("defaults childrenData to an empty array", () => {
      expect(makeBook().childrenData).toEqual([]);
    });

    it("stores provided childrenData", () => {
      const ch = makeChapter();
      expect(makeBook({ childrenData: [ch] }).childrenData).toEqual([ch]);
    });

    it("defaults activityIndicators to an empty array", () => {
      expect(makeBook().activityIndicators).toEqual([]);
    });

    it("stores initial activityIndicators from a provided Map", () => {
      const indicator = makeIndicator("i1");
      const map = new Map([["i1", indicator]]);
      expect(makeBook({ activityIndicators: map }).activityIndicators).toEqual([
        indicator,
      ]);
    });

    it("defaults highlightColor to undefined", () => {
      expect(makeBook().highlightColor).toBeUndefined();
    });
  });

  // ─── isSelected / select / deselect ──────────────────────────────────────────

  describe("isSelected / select / deselect", () => {
    it("select sets isSelected to true", () => {
      const book = makeBook();
      book.select();
      expect(book.isSelected).toBe(true);
    });

    it("deselect sets isSelected to false", () => {
      const book = makeBook({ isSelected: true });
      book.deselect();
      expect(book.isSelected).toBe(false);
    });

    it("deselect is idempotent when already false", () => {
      const book = makeBook();
      book.deselect();
      expect(book.isSelected).toBe(false);
    });
  });

  // ─── isActive / activate / deactivate ────────────────────────────────────────

  describe("isActive / activate / deactivate", () => {
    it("activate sets isActive to true", () => {
      const book = makeBook();
      book.activate();
      expect(book.isActive).toBe(true);
    });

    it("deactivate sets isActive to false", () => {
      const book = makeBook({ isActive: true });
      book.deactivate();
      expect(book.isActive).toBe(false);
    });
  });

  // ─── piece / clearPiece / setPiece ───────────────────────────────────────────

  describe("piece / clearPiece / setPiece", () => {
    it("piece getter returns undefined when no piece is set", () => {
      expect(makeBook().piece).toBeUndefined();
    });

    it("piece getter returns the stored piece", () => {
      const piece = makePiece();
      expect(makeBook({ piece }).piece).toBe(piece);
    });

    it("setPiece stores the piece", () => {
      const book = makeBook();
      const piece = makePiece();
      book.setPiece(piece as any);
      expect(book.piece).toBe(piece);
    });

    it("setPiece overwrites a previous piece", () => {
      const p1 = makePiece("p1");
      const p2 = makePiece("p2");
      const book = makeBook({ piece: p1 });
      book.setPiece(p2 as any);
      expect(book.piece).toBe(p2);
    });

    it("clearPiece returns the piece when one is set", () => {
      const piece = makePiece();
      const book = makeBook({ piece });
      expect(book.clearPiece()).toBe(piece);
    });

    it("clearPiece does not actually clear the piece — piece remains available after clearPiece", () => {
      const piece = makePiece();
      const book = makeBook({ piece });
      book.clearPiece();
      expect(book.piece).toBeUndefined();
    });

    it("clearPiece returns undefined when no piece is set", () => {
      expect(makeBook().clearPiece()).toBeUndefined();
    });
  });

  // ─── highlightColor ───────────────────────────────────────────────────────────

  describe("highlightColor / setHihglightColor / clearHighlightColor", () => {
    it("setHihglightColor stores the color", () => {
      const book = makeBook();
      book.setHihglightColor("#ff0000");
      expect(book.highlightColor).toBe("#ff0000");
    });

    it("setHihglightColor overwrites the previous color", () => {
      const book = makeBook();
      book.setHihglightColor("#ff0000");
      book.setHihglightColor("#00ff00");
      expect(book.highlightColor).toBe("#00ff00");
    });

    it("clearHighlightColor resets to undefined", () => {
      const book = makeBook();
      book.setHihglightColor("#ff0000");
      book.clearHighlightColor();
      expect(book.highlightColor).toBeUndefined();
    });
  });

  // ─── getPieceInfoProperty ─────────────────────────────────────────────────────

  describe("getPieceInfoProperty", () => {
    it("returns the value for 'bookId'", () => {
      const book = makeBook({ pieceInfo: makeBookInfo({ bookId: "num" }) });
      expect(book.getPieceInfoProperty("bookId")).toBe("num");
    });

    it("returns the value for 'author'", () => {
      const book = makeBook({ pieceInfo: makeBookInfo({ author: "Isaiah" }) });
      expect(book.getPieceInfoProperty("author")).toBe("Isaiah");
    });

    it("returns the value for 'numberOfChapters'", () => {
      const book = makeBook({
        pieceInfo: makeBookInfo({ numberOfChapters: 150 }),
      });
      expect(book.getPieceInfoProperty("numberOfChapters")).toBe(150);
    });
  });

  // ─── parentDataIds / clearParentId / clearParentIds ──────────────────────────

  describe("parentDataIds / clearParentId / clearParentIds", () => {
    it("parentDataIds getter returns a shallow copy — not the same reference", () => {
      const book = makeBook();
      expect(book.parentDataIds).not.toBe(book.parentDataIds);
    });

    it("parentDataIds getter reflects stored values", () => {
      const ids = makeParentIds({ layoutId: "layout-1" });
      expect(makeBook({ parentDataIds: ids }).parentDataIds?.layoutId).toBe(
        "layout-1"
      );
    });

    it("clearParentId sets the given key to undefined", () => {
      const book = makeBook({
        parentDataIds: makeParentIds({ layoutId: "layout-1" }),
      });
      book.clearParentId("layoutId");
      expect(book.parentDataIds?.layoutId).toBeUndefined();
    });

    it("clearParentId does not affect other keys", () => {
      const book = makeBook({
        parentDataIds: makeParentIds({
          layoutId: "layout-1",
          stackBibleId: "bible-1",
        }),
      });
      book.clearParentId("layoutId");
      expect(book.parentDataIds?.stackBibleId).toBe("bible-1");
    });

    it("clearParentIds clears all provided keys", () => {
      const book = makeBook({
        parentDataIds: makeParentIds({
          layoutId: "layout-1",
          stackBibleId: "bible-1",
        }),
      });
      book.clearParentIds(["layoutId", "stackBibleId"], false);
      expect(book.parentDataIds?.layoutId).toBeUndefined();
      expect(book.parentDataIds?.stackBibleId).toBeUndefined();
    });

    it("clearParentIds does not affect keys not in the list", () => {
      const book = makeBook({
        parentDataIds: makeParentIds({
          layoutId: "layout-1",
          stackBibleId: "bible-1",
        }),
      });
      book.clearParentIds(["layoutId"], false);
      expect(book.parentDataIds?.stackBibleId).toBe("bible-1");
    });

    it("clearParentIds propagates to children when propagate=true (default)", () => {
      const chapter = makeChapter({
        parentDataIds: makeParentIds({ layoutId: "layout-1" }),
      });
      const book = makeBook({ childrenData: [chapter] });
      book.clearParentIds(["layoutId"]);
      expect(chapter.parentDataIds?.layoutId).toBeUndefined();
    });

    it("clearParentIds does not propagate to children when propagate=false", () => {
      const chapter = makeChapter({
        parentDataIds: makeParentIds({ layoutId: "layout-1" }),
      });
      const book = makeBook({ childrenData: [chapter] });
      book.clearParentIds(["layoutId"], false);
      expect(chapter.parentDataIds?.layoutId).toBe("layout-1");
    });
  });

  // ─── childrenData / addChild / clearChildren / tryReplaceChild ───────────────

  describe("childrenData / addChild / clearChildren / tryReplaceChild", () => {
    it("childrenData getter returns a shallow copy — mutations do not affect internal state", () => {
      const ch = makeChapter();
      const book = makeBook({ childrenData: [ch] });
      const snapshot = book.childrenData;
      snapshot.push(makeChapter({ id: "chapter-99" }));
      expect(book.childrenData).toHaveLength(1);
    });

    it("addChild appends the chapter to childrenData", () => {
      const book = makeBook();
      const ch = makeChapter();
      book.addChild(ch);
      expect(book.childrenData).toEqual([ch]);
    });

    it("addChild accumulates multiple chapters in insertion order", () => {
      const book = makeBook();
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      book.addChild(ch1);
      book.addChild(ch2);
      expect(book.childrenData).toEqual([ch1, ch2]);
    });

    it("clearChildren returns all current children", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1, ch2] });
      expect(book.clearChildren()).toEqual([ch1, ch2]);
    });

    it("clearChildren resets childrenData to an empty array", () => {
      const book = makeBook({ childrenData: [makeChapter()] });
      book.clearChildren();
      expect(book.childrenData).toEqual([]);
    });

    it("clearChildren on an empty book returns an empty array", () => {
      expect(makeBook().clearChildren()).toEqual([]);
    });

    it("tryReplaceChild replaces the matching chapter and returns true", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(ch1, ch2)).toBe(true);
      expect(book.childrenData[0]).toBe(ch2);
    });

    it("tryReplaceChild returns false and leaves childrenData unchanged when chapter is not found", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(ch2, makeChapter())).toBe(false);
      expect(book.childrenData[0]).toBe(ch1);
    });

    it("tryReplaceChild uses reference equality — same id but different reference is not found", () => {
      const ch1 = makeChapter({ id: "ch-1" });
      const lookalike = makeChapter({ id: "ch-1" });
      const book = makeBook({ childrenData: [ch1] });
      expect(book.tryReplaceChild(lookalike, makeChapter())).toBe(false);
    });
  });

  // ─── activityIndicators ──────────────────────────────────────────────────────

  describe("activityIndicators", () => {
    it("returns an empty array when no indicators are registered", () => {
      expect(makeBook().activityIndicators).toEqual([]);
    });

    it("returns all registered indicators as an array", () => {
      const i1 = makeIndicator("i1", 0);
      const i2 = makeIndicator("i2", 1);
      const map = new Map([
        ["i1", i1],
        ["i2", i2],
      ]);
      expect(makeBook({ activityIndicators: map }).activityIndicators).toEqual([
        i1,
        i2,
      ]);
    });

    it("clearActivityIndicators returns the indicators and clears the map", () => {
      const i1 = makeIndicator("i1");
      const book = makeBook({ activityIndicators: new Map([["i1", i1]]) });
      const result = book.clearActivityIndicators();
      expect(result).toEqual([i1]);
      expect(book.activityIndicators).toEqual([]);
    });

    it("clearActivityIndicators returns undefined when no indicators are registered", () => {
      expect(makeBook().clearActivityIndicators()).toBeUndefined();
    });

    it("clearActivityIndicators returns undefined on a second call after already clearing", () => {
      const book = makeBook({
        activityIndicators: new Map([["i1", makeIndicator("i1")]]),
      });
      book.clearActivityIndicators();
      expect(book.clearActivityIndicators()).toBeUndefined();
    });

    it("addActivityIndicator does NOT add a new indicator when the id is not already in the map", () => {
      const book = makeBook();
      book.addActivityIndicator(makeIndicator("i1"));
      expect(book.activityIndicators).toEqual([]);
    });

    it("addActivityIndicator updates an existing indicator when the id is already in the map", () => {
      const original = makeIndicator("i1", 0);
      const updated = { ...original, index: 99 };
      const book = makeBook({
        activityIndicators: new Map([["i1", original]]),
      });
      book.addActivityIndicator(updated);
      expect(book.activityIndicators[0]).toEqual(updated);
    });

    it("removeActivityIndicator removes the indicator with the given id", () => {
      const book = makeBook({
        activityIndicators: new Map([["i1", makeIndicator("i1")]]),
      });
      book.removeActivityIndicator("i1");
      expect(book.activityIndicators).toEqual([]);
    });

    it("removeActivityIndicator is a no-op when the id does not exist in the map", () => {
      const i1 = makeIndicator("i1");
      const book = makeBook({ activityIndicators: new Map([["i1", i1]]) });
      book.removeActivityIndicator("nonexistent");
      expect(book.activityIndicators).toEqual([i1]);
    });
  });
});
