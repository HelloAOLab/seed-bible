import { parseVerseReference } from "@packages/seed-bible/seed-bible/managers/parseVerseReference";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function book(
  id: string,
  commonName: string,
  name = commonName,
  numberOfChapters = 50
): TranslationBook {
  return {
    id,
    name,
    commonName,
    title: null,
    order: 1,
    numberOfChapters,
    firstChapterNumber: 1,
  } as TranslationBook;
}

const BOOKS: TranslationBook[] = [
  book("GEN", "Genesis", "Genesis", 50),
  book("JHN", "John", "John", 21),
  book("1JN", "1 John", "1 John", 5),
  book("SNG", "Song of Songs", "Song of Songs", 8),
  book("PHP", "Philippians", "Philippians", 4),
  book("PHM", "Philemon", "Philemon", 1),
  book("JON", "Jonah", "Jonah", 4),
  book("JDG", "Judges", "Judges", 21),
  book("JUD", "Jude", "Jude", 1),
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

  it("matches by book id (case-insensitive)", () => {
    expect(parseVerseReference("JHN 1:1", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 1,
      verse: 1,
    });
    expect(parseVerseReference("phm 1:1", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 1,
    });
  });

  it("prefix-matches a book name when the prefix is unambiguous", () => {
    // "Philip" only starts Philippians (Philemon does not).
    expect(parseVerseReference("Philip 1:1", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 1,
      verse: 1,
    });
    expect(parseVerseReference("Gen 1:1", BOOKS)).toEqual({
      bookId: "GEN",
      chapter: 1,
      verse: 1,
    });
  });

  it("returns null for an ambiguous prefix when the chapter can't disambiguate", () => {
    // "Phil" starts both Philippians and Philemon, and both have a chapter 1.
    expect(parseVerseReference("Phil 1:1", BOOKS)).toBeNull();
    // "Jo" starts both John and Jonah, both of which have a chapter 1.
    expect(parseVerseReference("Jo 1:1", BOOKS)).toBeNull();
  });

  it("disambiguates an ambiguous prefix using the chapter number", () => {
    // "Phil" matches both Philippians and Philemon, but Philemon has only one
    // chapter, so "Phil 2" can only mean Philippians.
    expect(parseVerseReference("Phil 2", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 2,
    });
    expect(parseVerseReference("Phil 2:1", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 2,
      verse: 1,
    });
    // Jonah has 4 chapters and John has 21, so chapter 10 only fits John.
    expect(parseVerseReference("Jo 10:1", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 10,
      verse: 1,
    });
  });

  it("reads a bare number as a verse for a unique single-chapter book", () => {
    // Philemon has one chapter, so "Philemon 2" means verse 2, not chapter 2.
    expect(parseVerseReference("Philemon 2", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
    // Jude is unique and single-chapter, so "Jude 3" -> Jude 1:3.
    expect(parseVerseReference("Jude 3", BOOKS)).toEqual({
      bookId: "JUD",
      chapter: 1,
      verse: 3,
    });
    // "Jud" exactly matches Jude's id, so it resolves unambiguously even though
    // it is also a prefix of Judges -> Jude 1:3.
    expect(parseVerseReference("Jud 3", BOOKS)).toEqual({
      bookId: "JUD",
      chapter: 1,
      verse: 3,
    });
    // A single-chapter book reached by a unique prefix works too.
    expect(parseVerseReference("Philem 2", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
  });

  it("does not apply verse shorthand to a multi-chapter book", () => {
    // Philippians has several chapters, so a bare number stays a chapter.
    expect(parseVerseReference("Philippians 2", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 2,
    });
  });

  it("does not apply verse shorthand when the name is ambiguous", () => {
    // "Phil" matches Philippians and Philemon and neither is an exact match, so
    // the single-chapter book (Philemon) can't claim the number as a verse.
    // Both books have a chapter 1, so a bare "Phil 1" stays ambiguous (null)
    // rather than resolving to Philemon 1:1.
    expect(parseVerseReference("Phil 1", BOOKS)).toBeNull();
  });

  it("resolves a unique multi-chapter prefix to a whole chapter", () => {
    // "Judg" uniquely prefixes Judges (Jude does not start with "judg").
    expect(parseVerseReference("Judg 3", BOOKS)).toEqual({
      bookId: "JDG",
      chapter: 3,
    });
  });

  it("keeps an explicit chapter:verse reference in a single-chapter book", () => {
    // "Philemon 1:2" is unaffected by the shorthand.
    expect(parseVerseReference("Philemon 1:2", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
  });

  it("prefers an exact match over a prefix match", () => {
    // "John" exactly matches John even though it is a prefix of nothing else.
    expect(parseVerseReference("John 1:1", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 1,
      verse: 1,
    });
  });

  it("returns null for an unknown book", () => {
    expect(parseVerseReference("Nope 1:1", BOOKS)).toBeNull();
  });

  it("parses a whole-chapter reference (verse omitted)", () => {
    expect(parseVerseReference("Genesis 1", BOOKS)).toEqual({
      bookId: "GEN",
      chapter: 1,
    });
  });

  it("parses a whole-chapter range (verses omitted)", () => {
    expect(parseVerseReference("John 1-3", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 1,
      endChapter: 3,
    });
  });

  it("returns null for a chapter start with a verse end", () => {
    // "John 1-2:3" mixes a whole-chapter start with a verse end (ambiguous).
    expect(parseVerseReference("John 1-2:3", BOOKS)).toBeNull();
  });

  it("returns null for empty or malformed input", () => {
    expect(parseVerseReference("", BOOKS)).toBeNull();
    expect(parseVerseReference("   ", BOOKS)).toBeNull();
    expect(parseVerseReference("John", BOOKS)).toBeNull();
  });
});
