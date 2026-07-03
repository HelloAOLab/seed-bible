import { VersesBundleData } from "bibleVizUtils.domain.entities.VersesBunbleData";
import { VerseData } from "bibleVizUtils.domain.entities.VerseData";

// ─── factories ───────────────────────────────────────────────────────────────

const makePiece = (id = "p1") => ({ id, type: "VersesBundle" as const });

const makeVerse = (id = "verse-1") => new VerseData({ id });

const makeBundle = (overrides: any = {}) =>
  new VersesBundleData({ id: "bundle-1", ...overrides });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("VersesBundleData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the id", () => {
      expect(makeBundle({ id: "bundle-42" }).id).toBe("bundle-42");
    });

    it("defaults verses to an empty array", () => {
      expect(makeBundle().verses).toEqual([]);
    });

    it("stores provided verses", () => {
      const v1 = makeVerse("v-1");
      const v2 = makeVerse("v-2");
      expect(makeBundle({ verses: [v1, v2] }).verses).toEqual([v1, v2]);
    });

    it("defaults piece to undefined", () => {
      expect(makeBundle().piece).toBeUndefined();
    });

    it("stores a provided piece", () => {
      const piece = makePiece();
      expect(makeBundle({ piece }).piece).toBe(piece);
    });

    it("defaults isSelected to false", () => {
      expect(makeBundle().isSelected).toBe(false);
    });

    it("defaults isBeingDragged to false", () => {
      expect(makeBundle().isBeingDragged).toBe(false);
    });
  });

  // ─── verses / addVerse / removeVerse / clearVerses ───────────────────────────

  describe("verses / addVerse / removeVerse / clearVerses", () => {
    it("addVerse inserts a verse when its id is not already in the map", () => {
      const bundle = makeBundle();
      const verse = makeVerse("v-1");
      bundle.addVerse(verse);
      expect(bundle.verses).toEqual([verse]);
    });

    it("addVerse does not insert a duplicate when the id is already present", () => {
      const verse = makeVerse("v-1");
      const bundle = makeBundle({ verses: [verse] });
      bundle.addVerse(makeVerse("v-1"));
      expect(bundle.verses).toHaveLength(1);
      expect(bundle.verses[0]).toBe(verse);
    });

    it("addVerse accumulates multiple verses in insertion order", () => {
      const bundle = makeBundle();
      const v1 = makeVerse("v-1");
      const v2 = makeVerse("v-2");
      bundle.addVerse(v1);
      bundle.addVerse(v2);
      expect(bundle.verses).toEqual([v1, v2]);
    });

    it("removeVerse removes a verse that is present in the map", () => {
      const verse = makeVerse("v-1");
      const bundle = makeBundle({ verses: [verse] });
      bundle.removeVerse(verse);
      expect(bundle.verses).toEqual([]);
    });

    it("removeVerse is a no-op when the verse is not in the map", () => {
      const verse = makeVerse("v-1");
      const bundle = makeBundle({ verses: [verse] });
      bundle.removeVerse(makeVerse("nonexistent"));
      expect(bundle.verses).toEqual([verse]);
    });

    it("removeVerse matches by id — removing a different instance with the same id removes the entry", () => {
      const verse = makeVerse("v-1");
      const bundle = makeBundle({ verses: [verse] });
      bundle.removeVerse(makeVerse("v-1"));
      expect(bundle.verses).toEqual([]);
    });

    it("clearVerses returns all current verses and clears the map", () => {
      const v1 = makeVerse("v-1");
      const v2 = makeVerse("v-2");
      const bundle = makeBundle({ verses: [v1, v2] });
      const result = bundle.clearVerses();
      expect(result).toEqual([v1, v2]);
      expect(bundle.verses).toEqual([]);
    });

    it("clearVerses returns an empty array (not undefined) when no verses are present", () => {
      expect(makeBundle().clearVerses()).toEqual([]);
    });
  });

  // ─── piece / clearPiece / setPiece ───────────────────────────────────────────

  describe("piece / clearPiece / setPiece", () => {
    it("setPiece stores the piece", () => {
      const bundle = makeBundle();
      const piece = makePiece();
      bundle.setPiece(piece);
      expect(bundle.piece).toBe(piece);
    });

    it("setPiece overwrites a previous piece", () => {
      const p1 = makePiece("p1");
      const p2 = makePiece("p2");
      const bundle = makeBundle({ piece: p1 });
      bundle.setPiece(p2);
      expect(bundle.piece).toBe(p2);
    });

    it("clearPiece returns the piece and sets it to undefined", () => {
      const piece = makePiece();
      const bundle = makeBundle({ piece });
      expect(bundle.clearPiece()).toBe(piece);
      expect(bundle.piece).toBeUndefined();
    });

    it("clearPiece returns undefined when no piece is set", () => {
      expect(makeBundle().clearPiece()).toBeUndefined();
    });

    it("clearPiece returns undefined on a second call after already clearing", () => {
      const bundle = makeBundle({ piece: makePiece() });
      bundle.clearPiece();
      expect(bundle.clearPiece()).toBeUndefined();
    });
  });

  // ─── isSelected / select / deselect ──────────────────────────────────────────

  describe("isSelected / select / deselect", () => {
    it("select sets isSelected to true", () => {
      const bundle = makeBundle();
      bundle.select();
      expect(bundle.isSelected).toBe(true);
    });

    it("deselect sets isSelected to false", () => {
      const bundle = makeBundle();
      bundle.select();
      bundle.deselect();
      expect(bundle.isSelected).toBe(false);
    });

    it("deselect is idempotent when already false", () => {
      const bundle = makeBundle();
      bundle.deselect();
      expect(bundle.isSelected).toBe(false);
    });
  });

  // ─── isBeingDragged / beginDrag / endDrag ────────────────────────────────────

  describe("isBeingDragged / beginDrag / endDrag", () => {
    it("beginDrag sets isBeingDragged to true", () => {
      const bundle = makeBundle();
      bundle.beginDrag();
      expect(bundle.isBeingDragged).toBe(true);
    });

    it("endDrag sets isBeingDragged to false", () => {
      const bundle = makeBundle();
      bundle.beginDrag();
      bundle.endDrag();
      expect(bundle.isBeingDragged).toBe(false);
    });

    it("endDrag is idempotent when already false", () => {
      const bundle = makeBundle();
      bundle.endDrag();
      expect(bundle.isBeingDragged).toBe(false);
    });
  });
});
