import {
  parseSingleVerseReference,
  parseVerseReferenceCandidates,
} from "@packages/seed-bible/seed-bible/managers/parseVerseReference";
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

describe("parseSingleVerseReference", () => {
  it("parses a simple chapter:verse reference", () => {
    expect(parseSingleVerseReference("John 3:16", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 3,
      verse: 16,
    });
  });

  it("parses a numbered book with a verse range", () => {
    expect(parseSingleVerseReference("1 John 2:1-3", BOOKS)).toEqual({
      bookId: "1JN",
      chapter: 2,
      verse: 1,
      endVerse: 3,
    });
  });

  it("parses a range that spans chapters", () => {
    expect(parseSingleVerseReference("Genesis 1:1-2:3", BOOKS)).toEqual({
      bookId: "GEN",
      chapter: 1,
      verse: 1,
      endChapter: 2,
      endVerse: 3,
    });
  });

  it("matches multi-word book names case-insensitively", () => {
    expect(parseSingleVerseReference("song of SONGS 2:1", BOOKS)).toEqual({
      bookId: "SNG",
      chapter: 2,
      verse: 1,
    });
  });

  it("matches by book id (case-insensitive)", () => {
    expect(parseSingleVerseReference("JHN 1:1", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 1,
      verse: 1,
    });
    expect(parseSingleVerseReference("phm 1:1", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 1,
    });
  });

  it("prefix-matches a book name when the prefix is unambiguous", () => {
    // "Philip" only starts Philippians (Philemon does not).
    expect(parseSingleVerseReference("Philip 1:1", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 1,
      verse: 1,
    });
    expect(parseSingleVerseReference("Gen 1:1", BOOKS)).toEqual({
      bookId: "GEN",
      chapter: 1,
      verse: 1,
    });
  });

  it("returns null for an ambiguous prefix when the chapter can't disambiguate", () => {
    // "Phil" starts both Philippians and Philemon, and both have a chapter 1.
    expect(parseSingleVerseReference("Phil 1:1", BOOKS)).toBeNull();
    // "Jo" starts both John and Jonah, both of which have a chapter 1.
    expect(parseSingleVerseReference("Jo 1:1", BOOKS)).toBeNull();
  });

  it("disambiguates an ambiguous prefix using the chapter number", () => {
    // "Phil" matches both Philippians and Philemon, but Philemon has only one
    // chapter, so "Phil 2" can only mean Philippians.
    expect(parseSingleVerseReference("Phil 2", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 2,
    });
    expect(parseSingleVerseReference("Phil 2:1", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 2,
      verse: 1,
    });
    // Jonah has 4 chapters and John has 21, so chapter 10 only fits John.
    expect(parseSingleVerseReference("Jo 10:1", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 10,
      verse: 1,
    });
  });

  it("reads a bare number as a verse for a unique single-chapter book", () => {
    // Philemon has one chapter, so "Philemon 2" means verse 2, not chapter 2.
    expect(parseSingleVerseReference("Philemon 2", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
    // Jude is unique and single-chapter, so "Jude 3" -> Jude 1:3.
    expect(parseSingleVerseReference("Jude 3", BOOKS)).toEqual({
      bookId: "JUD",
      chapter: 1,
      verse: 3,
    });
    // "Jud" exactly matches Jude's id, so it resolves unambiguously even though
    // it is also a prefix of Judges -> Jude 1:3.
    expect(parseSingleVerseReference("Jud 3", BOOKS)).toEqual({
      bookId: "JUD",
      chapter: 1,
      verse: 3,
    });
    // A single-chapter book reached by a unique prefix works too.
    expect(parseSingleVerseReference("Philem 2", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
  });

  it("does not apply verse shorthand to a multi-chapter book", () => {
    // Philippians has several chapters, so a bare number stays a chapter.
    expect(parseSingleVerseReference("Philippians 2", BOOKS)).toEqual({
      bookId: "PHP",
      chapter: 2,
    });
  });

  it("does not apply verse shorthand when the name is ambiguous", () => {
    // "Phil" matches Philippians and Philemon and neither is an exact match, so
    // the single-chapter book (Philemon) can't claim the number as a verse.
    // Both books have a chapter 1, so a bare "Phil 1" stays ambiguous (null)
    // rather than resolving to Philemon 1:1.
    expect(parseSingleVerseReference("Phil 1", BOOKS)).toBeNull();
  });

  it("resolves a unique multi-chapter prefix to a whole chapter", () => {
    // "Judg" uniquely prefixes Judges (Jude does not start with "judg").
    expect(parseSingleVerseReference("Judg 3", BOOKS)).toEqual({
      bookId: "JDG",
      chapter: 3,
    });
  });

  it("keeps an explicit chapter:verse reference in a single-chapter book", () => {
    // "Philemon 1:2" is unaffected by the shorthand.
    expect(parseSingleVerseReference("Philemon 1:2", BOOKS)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
  });

  it("prefers an exact match over a prefix match", () => {
    // "John" exactly matches John even though it is a prefix of nothing else.
    expect(parseSingleVerseReference("John 1:1", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 1,
      verse: 1,
    });
  });

  it("returns null for an unknown book", () => {
    expect(parseSingleVerseReference("Nope 1:1", BOOKS)).toBeNull();
  });

  it("parses a whole-chapter reference (verse omitted)", () => {
    expect(parseSingleVerseReference("Genesis 1", BOOKS)).toEqual({
      bookId: "GEN",
      chapter: 1,
    });
  });

  it("parses a whole-chapter range (verses omitted)", () => {
    expect(parseSingleVerseReference("John 1-3", BOOKS)).toEqual({
      bookId: "JHN",
      chapter: 1,
      endChapter: 3,
    });
  });

  it("returns null for a chapter start with a verse end", () => {
    // "John 1-2:3" mixes a whole-chapter start with a verse end (ambiguous).
    expect(parseSingleVerseReference("John 1-2:3", BOOKS)).toBeNull();
  });

  it("returns null for empty or malformed input", () => {
    expect(parseSingleVerseReference("", BOOKS)).toBeNull();
    expect(parseSingleVerseReference("   ", BOOKS)).toBeNull();
    expect(parseSingleVerseReference("John", BOOKS)).toBeNull();
  });
});

describe("parseVerseReferenceCandidates", () => {
  it("returns a single-element list for an unambiguous reference", () => {
    expect(parseVerseReferenceCandidates("John 3:16", BOOKS)).toEqual([
      { bookId: "JHN", chapter: 3, verse: 16 },
    ]);
  });

  it("returns every book that matches an ambiguous prefix", () => {
    // "Phil" prefixes both Philippians and Philemon, and both have a chapter 1.
    expect(parseVerseReferenceCandidates("Phil 1:1", BOOKS)).toEqual([
      { bookId: "PHP", chapter: 1, verse: 1 },
      { bookId: "PHM", chapter: 1, verse: 1 },
    ]);
    // Bare chapter form is ambiguous the same way.
    expect(parseVerseReferenceCandidates("Phil 1", BOOKS)).toEqual([
      { bookId: "PHP", chapter: 1 },
      { bookId: "PHM", chapter: 1 },
    ]);
  });

  it("narrows an ambiguous prefix by chapter, leaving one match", () => {
    // Only Philippians has a chapter 2, so Philemon drops out.
    expect(parseVerseReferenceCandidates("Phil 2", BOOKS)).toEqual([
      { bookId: "PHP", chapter: 2 },
    ]);
  });

  it("returns an empty list for an unknown book or invalid format", () => {
    expect(parseVerseReferenceCandidates("Nope 1:1", BOOKS)).toEqual([]);
    expect(parseVerseReferenceCandidates("John 1-2:3", BOOKS)).toEqual([]);
    expect(parseVerseReferenceCandidates("", BOOKS)).toEqual([]);
  });

  it("applies the single-chapter verse shorthand for a unique name", () => {
    expect(parseVerseReferenceCandidates("Philemon 2", BOOKS)).toEqual([
      { bookId: "PHM", chapter: 1, verse: 2 },
    ]);
  });

  it("returns exactly what parseSingleVerseReference collapses to", () => {
    // Unambiguous -> the sole element; ambiguous or unmatched -> null.
    expect(parseSingleVerseReference("Phil 2", BOOKS)).toEqual(
      parseVerseReferenceCandidates("Phil 2", BOOKS)[0]
    );
    expect(parseVerseReferenceCandidates("Phil 1", BOOKS)).toHaveLength(2);
    expect(parseSingleVerseReference("Phil 1", BOOKS)).toBeNull();
  });
});

describe("parseSingleVerseReference with optional translation books", () => {
  // spa_onbv-style names; commonName/name differ to exercise both fields.
  const spaBooks: TranslationBook[] = [
    book("GEN", "Génesis", "Genesis", 50),
    book("EZR", "Esdras", "Esdras", 10),
    book("NEH", "Nehemías", "Nehemías", 13),
    book("1CO", "1 Corintios", "1 Corintios", 16),
    book("PHP", "Filipenses", "Filipenses", 4),
    book("PHM", "Filemón", "Filemón", 1),
    book("JHN", "Juan", "Juan", 21),
    book("1JN", "1 Juan", "1 Juan", 5),
  ];

  it("matches localized common/name before English", () => {
    expect(parseSingleVerseReference("Esdras 3", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
    });
    expect(parseVerseReferenceCandidates("Esdras 3", spaBooks)).toEqual([
      { bookId: "EZR", chapter: 3 },
    ]);
    expect(parseSingleVerseReference("1 Corintios 13:4", spaBooks)).toEqual({
      bookId: "1CO",
      chapter: 13,
      verse: 4,
    });
  });

  it("matches localized names case-insensitively", () => {
    expect(parseSingleVerseReference("esdras 3", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
    });
    expect(parseSingleVerseReference("ESDRAS 3:1", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
      verse: 1,
    });
  });

  it("prefix-matches a unique localized name", () => {
    // "Esd" uniquely prefixes Esdras among spaBooks.
    expect(parseSingleVerseReference("Esd 3", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
    });
    // "Filip" uniquely prefixes Filipenses (Filemón does not start with "filip").
    expect(parseSingleVerseReference("Filip 2", spaBooks)).toEqual({
      bookId: "PHP",
      chapter: 2,
    });
  });

  it("returns every prefix match when the localized prefix is ambiguous", () => {
    // "Fil" prefixes both Filipenses and Filemón; both have chapter 1.
    expect(parseVerseReferenceCandidates("Fil 1", spaBooks)).toEqual([
      { bookId: "PHP", chapter: 1 },
      { bookId: "PHM", chapter: 1 },
    ]);
    expect(parseSingleVerseReference("Fil 1", spaBooks)).toBeNull();
    // Chapter 2 only exists on Filipenses.
    expect(parseSingleVerseReference("Fil 2", spaBooks)).toEqual({
      bookId: "PHP",
      chapter: 2,
    });
  });

  it("applies single-chapter verse shorthand for a unique localized name", () => {
    // Filemón has one chapter, so "Filemón 2" is verse 2, not chapter 2.
    expect(parseSingleVerseReference("Filemón 2", spaBooks)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
  });

  it("falls back to English / book id when books are omitted", () => {
    expect(parseSingleVerseReference("John 3:16")).toEqual({
      bookId: "JHN",
      chapter: 3,
      verse: 16,
    });
    expect(parseSingleVerseReference("GEN 1:1")).toEqual({
      bookId: "GEN",
      chapter: 1,
      verse: 1,
    });
    expect(parseVerseReferenceCandidates("Esdras 3")).toEqual([]);
    expect(parseSingleVerseReference("Esdras 3")).toBeNull();
  });

  it("falls back to English when books is an empty list", () => {
    expect(parseSingleVerseReference("John 3:16", [])).toEqual({
      bookId: "JHN",
      chapter: 3,
      verse: 16,
    });
    expect(parseVerseReferenceCandidates("Esdras 3", [])).toEqual([]);
  });

  it("falls back to English when the localized list has no match", () => {
    // "John" is not among Spanish names, but the English map still resolves.
    expect(parseSingleVerseReference("John 3:16", spaBooks)).toEqual({
      bookId: "JHN",
      chapter: 3,
      verse: 16,
    });
    // English "Ezra" resolves via getBookId, then reuses spa book metadata.
    expect(parseSingleVerseReference("Ezra 3", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
    });
  });

  it("reuses translation metadata when falling back through English names", () => {
    // "Philemon" is English; spa list has Filemón (PHM, one chapter). After the
    // English id resolves, metadata from spaBooks makes the verse shorthand apply.
    expect(parseSingleVerseReference("Philemon 2", spaBooks)).toEqual({
      bookId: "PHM",
      chapter: 1,
      verse: 2,
    });
  });

  it("parses verse and chapter ranges with localized names", () => {
    expect(parseSingleVerseReference("Esdras 3:1-5", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
      verse: 1,
      endVerse: 5,
    });
    expect(parseSingleVerseReference("Esdras 1:1-2:3", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 1,
      verse: 1,
      endChapter: 2,
      endVerse: 3,
    });
    expect(parseSingleVerseReference("Esdras 1-3", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 1,
      endChapter: 3,
    });
  });

  it("matches by book id when listed in the translation", () => {
    expect(parseSingleVerseReference("EZR 3", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
    });
    expect(parseSingleVerseReference("ezr 3:1", spaBooks)).toEqual({
      bookId: "EZR",
      chapter: 3,
      verse: 1,
    });
  });

  it("returns null for a fully unknown localized name", () => {
    expect(parseSingleVerseReference("Nopeón 1", spaBooks)).toBeNull();
    expect(parseVerseReferenceCandidates("Nopeón 1", spaBooks)).toEqual([]);
  });
});
