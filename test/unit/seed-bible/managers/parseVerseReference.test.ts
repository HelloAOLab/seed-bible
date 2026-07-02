import { parseVerseReference } from "@packages/seed-bible/seed-bible/managers/parseVerseReference";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function book(
  id: string,
  commonName: string,
  name = commonName
): TranslationBook {
  return {
    id,
    name,
    commonName,
    title: null,
    order: 1,
    numberOfChapters: 50,
    firstChapterNumber: 1,
  } as TranslationBook;
}

const BOOKS: TranslationBook[] = [
  book("GEN", "Genesis"),
  book("JHN", "John"),
  book("1JN", "1 John"),
  book("SNG", "Song of Songs"),
];

describe("parseVerseReference", () => {
  it("parses a simple chapter:verse reference", () => {
    expect(parseVerseReference("John 3:16", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 3,
      verse: 16,
    });
  });

  it("parses a numbered book with a verse range", () => {
    expect(parseVerseReference("1 John 2:1-3", BOOKS)).toEqual({
      bookId: "1JN",
      chapter: 2,
      verse: 1,
      endVerse: 3,
    });
  });

  it("parses a range that spans chapters", () => {
    expect(parseVerseReference("Genesis 1:1-2:3", BOOKS)).toEqual({
      bookId: "GEN",
      chapter: 1,
      verse: 1,
      endChapter: 2,
      endVerse: 3,
    });
  });

  it("matches multi-word book names case-insensitively", () => {
    expect(parseVerseReference("song of SONGS 2:1", BOOKS)).toEqual({
      bookId: "SNG",
      chapter: 2,
      verse: 1,
    });
  });

  it("matches by book id", () => {
    expect(parseVerseReference("JHN 1:1", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 1,
      verse: 1,
    });
  });

  it("returns null for an unknown book", () => {
    expect(parseVerseReference("Nope 1:1", BOOKS)).toBeNull();
  });

  it("returns null when a verse is missing", () => {
    expect(parseVerseReference("Genesis 1", BOOKS)).toBeNull();
  });

  it("returns null for empty or malformed input", () => {
    expect(parseVerseReference("", BOOKS)).toBeNull();
    expect(parseVerseReference("   ", BOOKS)).toBeNull();
    expect(parseVerseReference("John", BOOKS)).toBeNull();
  });
});
