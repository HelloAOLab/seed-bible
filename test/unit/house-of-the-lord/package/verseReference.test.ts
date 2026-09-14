import { EXPERIENCE_KEYS } from "@packages/house-of-the-lord/experience";
import { TABERNACLE_PIECE_KEYS } from "@packages/house-of-the-lord/pieceKeys";
import {
  getPiecesForChapter,
  getPiecesForExperience,
  toPieceLabel,
} from "@packages/house-of-the-lord/verseReference";
import { describe, it, expect } from "vitest";

describe("verseReference.getPiecesForExperience", () => {
  it("returns nothing for empty input", () => {
    expect(getPiecesForExperience(EXPERIENCE_KEYS.TABERNACLE, [])).toEqual([]);
  });

  it("returns nothing when no matches found", () => {
    expect(
      getPiecesForExperience(EXPERIENCE_KEYS.TABERNACLE, [
        {
          bookId: "EXO",
          chapter: 25,
          verse: 9,
        },
      ])
    ).toEqual([]);
  });

  it("does not leak pieces across experiences", () => {
    expect(
      getPiecesForExperience(EXPERIENCE_KEYS.SOLOMON_TEMPLE, [
        {
          bookId: "EXO",
          chapter: 25,
          verse: 10,
        },
      ])
    ).toEqual([]);
  });

  it("returns only one key with one matching verse coordinate", () => {
    const result = getPiecesForExperience(EXPERIENCE_KEYS.TABERNACLE, [
      {
        bookId: "EXO",
        chapter: 25,
        verse: 10,
      },
    ]);
    expect(result).toEqual([TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]);
  });

  it("dedupes a key referenced by multiple verses", () => {
    const result = getPiecesForExperience(EXPERIENCE_KEYS.TABERNACLE, [
      { bookId: "EXO", chapter: 25, verse: 10 },
      { bookId: "EXO", chapter: 25, verse: 15 },
      { bookId: "EXO", chapter: 25, verse: 20 },
    ]);
    expect(result).toEqual([TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]);
  });

  it("dedupes a key for duplicated matching verses", () => {
    const result = getPiecesForExperience(EXPERIENCE_KEYS.TABERNACLE, [
      { bookId: "EXO", chapter: 25, verse: 10 },
      { bookId: "EXO", chapter: 25, verse: 10 },
    ]);
    expect(result).toEqual([TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]);
  });

  it("keeps all matching keys in order", () => {
    expect(
      getPiecesForExperience(EXPERIENCE_KEYS.TABERNACLE, [
        { bookId: "EXO", chapter: 39, verse: 38 },
      ])
    ).toEqual([
      TABERNACLE_PIECE_KEYS.INCENSE_ALTAR,
      TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE,
      TABERNACLE_PIECE_KEYS.BRONZE_LAVER,
    ]);
  });

  it("keeps appearance order, discarding later duplicates", () => {
    expect(
      getPiecesForExperience(EXPERIENCE_KEYS.TABERNACLE, [
        { bookId: "EXO", chapter: 39, verse: 33 },
        { bookId: "EXO", chapter: 39, verse: 36 },
        { bookId: "EXO", chapter: 39, verse: 38 },
      ])
    ).toEqual([
      TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT,
      TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD,
      TABERNACLE_PIECE_KEYS.MENORAH,
      TABERNACLE_PIECE_KEYS.INCENSE_ALTAR,
      TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE,
      TABERNACLE_PIECE_KEYS.BRONZE_LAVER,
    ]);
  });
});

describe("verseReference.getPiecesForChapter", () => {
  it("returns nothing for a book with no references", () => {
    expect(getPiecesForChapter(EXPERIENCE_KEYS.TABERNACLE, "JHN", 1)).toEqual(
      []
    );
  });

  it("returns nothing for a chapter with no references", () => {
    expect(getPiecesForChapter(EXPERIENCE_KEYS.TABERNACLE, "EXO", 1)).toEqual(
      []
    );
  });

  it("does not leak pieces across experiences", () => {
    expect(
      getPiecesForChapter(EXPERIENCE_KEYS.SOLOMON_TEMPLE, "EXO", 25)
    ).toEqual([]);
  });

  it("dedupes pieces spanning many verses, keeping verse order", () => {
    expect(getPiecesForChapter(EXPERIENCE_KEYS.TABERNACLE, "EXO", 25)).toEqual([
      TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT,
      TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD,
      TABERNACLE_PIECE_KEYS.MENORAH,
    ]);
  });

  it("keeps first-appearance order when later verses repeat earlier pieces", () => {
    expect(getPiecesForChapter(EXPERIENCE_KEYS.TABERNACLE, "EXO", 39)).toEqual([
      TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT,
      TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD,
      TABERNACLE_PIECE_KEYS.MENORAH,
      TABERNACLE_PIECE_KEYS.INCENSE_ALTAR,
      TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE,
      TABERNACLE_PIECE_KEYS.BRONZE_LAVER,
      TABERNACLE_PIECE_KEYS.INNER_CURTAIN,
      TABERNACLE_PIECE_KEYS.FRONT_CURTAIN,
      TABERNACLE_PIECE_KEYS.FENCE,
    ]);
  });
});

describe("verseReference.toPieceLabel", () => {
  it("upper cases a single word", () => {
    expect(toPieceLabel("test")).toBe("Test");
  });

  it("upper cases all words and replaces dashes with spaces", () => {
    expect(toPieceLabel("my-test-string")).toBe("My Test String");
  });

  it("preserves upper cased words", () => {
    expect(toPieceLabel("My-Test-String")).toBe("My Test String");
  });

  it("returns an empty string from an empty string input", () => {
    expect(toPieceLabel("")).toBe("");
  });

  it("only upper cases the first character, preserving the rest of the word", () => {
    expect(toPieceLabel("TEST")).toBe("TEST");
    expect(toPieceLabel("tEST")).toBe("TEST");
  });
});
