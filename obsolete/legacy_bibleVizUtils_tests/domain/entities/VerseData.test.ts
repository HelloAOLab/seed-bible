import { VerseData } from "bibleVizUtils.domain.entities.VerseData";

// ─── factories ───────────────────────────────────────────────────────────────

const makePiece = (id = "p1") => ({ id, type: "Verse" as const });

const makeVerse = (overrides: any = {}) =>
  new VerseData({ id: "verse-1", ...overrides });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("VerseData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the id", () => {
      expect(makeVerse({ id: "verse-42" }).id).toBe("verse-42");
    });

    it("piece must be defined", () => {
      const piece = makePiece();
      expect(makeVerse({ piece }).piece).toBe(piece);
    });
  });

  // ─── piece / clearPiece / setPiece ───────────────────────────────────────────

  describe("piece / clearPiece / setPiece", () => {
    it("piece getter returns undefined before any piece is set", () => {
      expect(makeVerse().piece).toBeUndefined();
    });

    it("setPiece stores the piece", () => {
      const verse = makeVerse();
      const piece = makePiece();
      verse.setPiece(piece);
      expect(verse.piece).toBe(piece);
    });

    it("setPiece overwrites a previous piece", () => {
      const verse = makeVerse();
      const p1 = makePiece("p1");
      const p2 = makePiece("p2");
      verse.setPiece(p1);
      verse.setPiece(p2);
      expect(verse.piece).toBe(p2);
    });

    it("clearPiece returns the piece and sets it to undefined", () => {
      const verse = makeVerse();
      const piece = makePiece();
      verse.setPiece(piece);
      const result = verse.clearPiece();
      expect(result).toBe(piece);
      expect(verse.piece).toBeUndefined();
    });

    it("clearPiece returns undefined when no piece is set", () => {
      expect(makeVerse().clearPiece()).toBeUndefined();
    });

    it("clearPiece returns undefined on a second call after already clearing", () => {
      const verse = makeVerse();
      verse.setPiece(makePiece());
      verse.clearPiece();
      expect(verse.clearPiece()).toBeUndefined();
    });
  });
});
