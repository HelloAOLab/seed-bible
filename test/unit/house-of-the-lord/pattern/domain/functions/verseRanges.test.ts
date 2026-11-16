import { describe, it, expect } from "vitest";
import {
  ToVerseRanges,
  FormatVerseRange,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/functions/verseRanges";
import type { VerseReference } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";

const ref = (
  bookId: string,
  chapter: number,
  verse: number
): VerseReference => ({ bookId, chapter, verse });

describe("domain.functions.verseRanges.ToVerseRanges", () => {
  it("returns an empty array for no references", () => {
    expect(ToVerseRanges([])).toEqual([]);
  });

  it("merges consecutive verses into a single range", () => {
    expect(
      ToVerseRanges([ref("EXO", 25, 1), ref("EXO", 25, 2), ref("EXO", 25, 3)])
    ).toEqual([{ bookId: "EXO", chapter: 25, start: 1, end: 3 }]);
  });

  it("keeps a gap as two separate ranges", () => {
    expect(
      ToVerseRanges([ref("EXO", 25, 1), ref("EXO", 25, 2), ref("EXO", 25, 5)])
    ).toEqual([
      { bookId: "EXO", chapter: 25, start: 1, end: 2 },
      { bookId: "EXO", chapter: 25, start: 5, end: 5 },
    ]);
  });

  it("does not merge across a chapter boundary", () => {
    expect(ToVerseRanges([ref("EXO", 25, 40), ref("EXO", 26, 1)])).toEqual([
      { bookId: "EXO", chapter: 25, start: 40, end: 40 },
      { bookId: "EXO", chapter: 26, start: 1, end: 1 },
    ]);
  });

  it("does not merge across a book boundary even for a consecutive verse", () => {
    expect(ToVerseRanges([ref("EXO", 25, 1), ref("LEV", 25, 2)])).toEqual([
      { bookId: "EXO", chapter: 25, start: 1, end: 1 },
      { bookId: "LEV", chapter: 25, start: 2, end: 2 },
    ]);
  });

  it("only merges into the previous range, so unsorted input fragments (callers must pre-sort)", () => {
    expect(
      ToVerseRanges([ref("EXO", 25, 1), ref("EXO", 25, 3), ref("EXO", 25, 2)])
    ).toEqual([
      { bookId: "EXO", chapter: 25, start: 1, end: 1 },
      { bookId: "EXO", chapter: 25, start: 3, end: 3 },
      { bookId: "EXO", chapter: 25, start: 2, end: 2 },
    ]);
  });
});

describe("domain.functions.verseRanges.FormatVerseRange", () => {
  it("renders a single verse without a range", () => {
    expect(
      FormatVerseRange(
        { bookId: "EXO", chapter: 25, start: 1, end: 1 },
        "Exodus"
      )
    ).toBe("Exodus 25:1");
  });

  it("renders a multi-verse range with an en dash", () => {
    expect(
      FormatVerseRange(
        { bookId: "EXO", chapter: 25, start: 1, end: 5 },
        "Exodus"
      )
    ).toBe("Exodus 25:1–5");
  });
});
