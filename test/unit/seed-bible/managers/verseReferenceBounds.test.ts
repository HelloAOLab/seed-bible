import { describe, expect, it } from "vitest";
import {
  BOOK_CHAPTER_VERSE_COUNTS,
  getBookChapterCount,
  getChapterVerseCount,
} from "@packages/seed-bible/seed-bible/managers/bookChapterVerseCounts";
import {
  bookHasChapter,
  isVerseReferenceInBounds,
} from "@packages/seed-bible/seed-bible/managers/verseReferenceBounds";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function book(
  id: string,
  numberOfChapters: number,
  firstChapterNumber = 1
): TranslationBook {
  return {
    id,
    name: id,
    commonName: id,
    title: null,
    order: 1,
    numberOfChapters,
    firstChapterNumber,
  } as TranslationBook;
}

describe("bookChapterVerseCounts", () => {
  it("has 150 Psalms totaling 2461 verses (English Protestant)", () => {
    const psa = BOOK_CHAPTER_VERSE_COUNTS.PSA!;
    expect(psa).toHaveLength(150);
    expect(psa.reduce((sum, n) => sum + n, 0)).toBe(2461);
  });

  it("records unambiguous Psalm last-verse counts", () => {
    expect(getChapterVerseCount("PSA", 117)).toBe(2);
    expect(getChapterVerseCount("PSA", 119)).toBe(176);
    expect(getChapterVerseCount("PSA", 150)).toBe(6);
  });

  it("exposes chapter counts and rejects out-of-range chapters", () => {
    expect(getBookChapterCount("GEN")).toBe(50);
    expect(getChapterVerseCount("GEN", 50)).toBe(26);
    expect(getChapterVerseCount("GEN", 0)).toBeUndefined();
    expect(getChapterVerseCount("GEN", 51)).toBeUndefined();
    expect(getChapterVerseCount("TOB", 1)).toBeUndefined();
  });
});

describe("bookHasChapter", () => {
  it("respects firstChapterNumber and numberOfChapters", () => {
    const gen = book("GEN", 50);
    expect(bookHasChapter(gen, 1)).toBe(true);
    expect(bookHasChapter(gen, 50)).toBe(true);
    expect(bookHasChapter(gen, 0)).toBe(false);
    expect(bookHasChapter(gen, 51)).toBe(false);
  });
});

describe("isVerseReferenceInBounds", () => {
  it("accepts in-bounds chapter and verse against static data", () => {
    expect(isVerseReferenceInBounds("GEN", 1, 1)).toBe(true);
    expect(isVerseReferenceInBounds("PSA", 150, 6)).toBe(true);
    expect(isVerseReferenceInBounds("REV", 22, 21)).toBe(true);
  });

  it("rejects chapter over and verse over against static data", () => {
    expect(isVerseReferenceInBounds("GEN", 999)).toBe(false);
    expect(isVerseReferenceInBounds("GEN", 1, 999)).toBe(false);
    expect(isVerseReferenceInBounds("JUD", 5, 1)).toBe(false);
    expect(isVerseReferenceInBounds("GEN", 0)).toBe(false);
    expect(isVerseReferenceInBounds("GEN", 1, 0)).toBe(false);
  });

  it("validates both ends of a cross-chapter range", () => {
    expect(isVerseReferenceInBounds("GEN", 1, 1, 2, 3)).toBe(true);
    expect(isVerseReferenceInBounds("GEN", 1, 1, 999, 1)).toBe(false);
    expect(isVerseReferenceInBounds("REV", 22, 1, undefined, 99)).toBe(false);
  });

  it("accepts chapter/verse ≥ 1 for unknown books without static data", () => {
    expect(isVerseReferenceInBounds("TOB", 1, 1)).toBe(true);
    expect(isVerseReferenceInBounds("TOB", 0, 1)).toBe(false);
    expect(isVerseReferenceInBounds("TOB", 1, 0)).toBe(false);
  });

  it("uses translation chapter range and skips Protestant verse maxima", () => {
    const books = [book("DAN", 12)];
    // Chapter gating still applies from the translation.
    expect(
      isVerseReferenceInBounds("DAN", 13, 1, undefined, undefined, books)
    ).toBe(false);
    // Verse 57 is beyond the Protestant static max for Daniel 3 (30), but
    // must pass when a translation book is loaded.
    expect(
      isVerseReferenceInBounds("DAN", 3, 57, undefined, undefined, books)
    ).toBe(true);
    expect(isVerseReferenceInBounds("DAN", 3, 57)).toBe(false);
  });
});
