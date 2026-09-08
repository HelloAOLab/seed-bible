import {
  buildTail,
  splitTypedVerseReference,
} from "@packages/seed-bible/seed-bible/managers/verseReferenceSyntax";

const genesis11 = {
  bookQuery: "Gen",
  chapterStr: "1",
  verseStr: "1",
};

describe("splitTypedVerseReference", () => {
  it("accepts the colon and period chapter-verse separators", () => {
    expect(splitTypedVerseReference("Gen 1:1")).toMatchObject(genesis11);
    expect(splitTypedVerseReference("Gen 1.1")).toMatchObject(genesis11);
    expect(splitTypedVerseReference("Gen.1.1")).toMatchObject(genesis11);
  });

  it("accepts an abbreviation period before the numbers", () => {
    expect(splitTypedVerseReference("Gen. 1:1")).toMatchObject(genesis11);
    expect(splitTypedVerseReference("Gen. 1.1")).toMatchObject(genesis11);
    expect(splitTypedVerseReference("Gen.1:1")).toMatchObject({
      bookQuery: "Gen",
      chapterStr: "1",
      verseStr: "1",
    });
  });

  it("is case-insensitive on the book query and trims surrounding space", () => {
    expect(splitTypedVerseReference("  gen 1.1  ")).toMatchObject({
      bookQuery: "gen",
      chapterStr: "1",
      verseStr: "1",
    });
    expect(splitTypedVerseReference("GEN.1.1")).toMatchObject({
      bookQuery: "GEN",
      chapterStr: "1",
      verseStr: "1",
    });
  });

  it("parses verse ranges and cross-chapter ranges with either separator", () => {
    expect(splitTypedVerseReference("John 3.16-18")).toMatchObject({
      bookQuery: "John",
      chapterStr: "3",
      verseStr: "16",
      endVerseStr: "18",
    });
    expect(splitTypedVerseReference("Gen.1.1-2.3")).toMatchObject({
      bookQuery: "Gen",
      chapterStr: "1",
      verseStr: "1",
      endChapterStr: "2",
      endVerseStr: "3",
    });
    expect(splitTypedVerseReference("Gen 1.1-2:3")).toMatchObject({
      bookQuery: "Gen",
      chapterStr: "1",
      verseStr: "1",
      endChapterStr: "2",
      endVerseStr: "3",
    });
  });

  it("parses numbered books in compact and spaced forms", () => {
    expect(splitTypedVerseReference("1 John 1.1")).toMatchObject({
      bookQuery: "1 John",
      chapterStr: "1",
      verseStr: "1",
    });
    expect(splitTypedVerseReference("1Jn.1.1")).toMatchObject({
      bookQuery: "1Jn",
      chapterStr: "1",
      verseStr: "1",
    });
    expect(splitTypedVerseReference("1 Cor. 13.4")).toMatchObject({
      bookQuery: "1 Cor",
      chapterStr: "13",
      verseStr: "4",
    });
  });

  it("parses chapter-only references with a space or a period", () => {
    const genesis1 = { bookQuery: "Gen", chapterStr: "1" };
    expect(splitTypedVerseReference("Gen 1")).toEqual(genesis1);
    expect(splitTypedVerseReference("Gen.1")).toEqual(genesis1);
    expect(splitTypedVerseReference("gen.1")).toEqual({
      bookQuery: "gen",
      chapterStr: "1",
    });
  });

  it("tolerates space around the range mark in typed input", () => {
    // A spaced range typed into a reference field is unambiguous, unlike the
    // same text in prose. Kept deliberately looser than the prose scanner.
    const genesis1to3 = {
      bookQuery: "Gen",
      chapterStr: "1",
      endVerseStr: "3",
    };
    expect(splitTypedVerseReference("Gen 1-3")).toMatchObject(genesis1to3);
    expect(splitTypedVerseReference("Gen 1 - 3")).toMatchObject(genesis1to3);
  });

  it("does not join the book to the chapter with a colon", () => {
    // The colon separates chapter from verse ("Gen 1:1"); between book and
    // chapter it is not part of the syntax at all.
    expect(splitTypedVerseReference("Gen:1")).toBeNull();
    expect(splitTypedVerseReference("gen:1")).toBeNull();
    expect(splitTypedVerseReference("Gen: 1")).toBeNull();
    expect(splitTypedVerseReference("Gen:1:1")).toBeNull();
    expect(splitTypedVerseReference("Mark: 3 things")).toBeNull();
  });

  it("keeps a book-only query so suggestions can still match", () => {
    expect(splitTypedVerseReference("Phil")).toEqual({ bookQuery: "Phil" });
    // A trailing abbreviation period is not part of the name. A colon is not
    // abbreviation punctuation, so "Gen:" is rejected outright.
    expect(splitTypedVerseReference("Gen.")).toEqual({ bookQuery: "Gen" });
    expect(splitTypedVerseReference("Gen:")).toBeNull();
  });

  it("returns null for empty input or a number with no book letters", () => {
    expect(splitTypedVerseReference("")).toBeNull();
    expect(splitTypedVerseReference("   ")).toBeNull();
    expect(splitTypedVerseReference("1.1")).toBeNull();
    expect(splitTypedVerseReference("1:1")).toBeNull();
    expect(splitTypedVerseReference(".")).toBeNull();
  });
});

describe("buildTail", () => {
  it("builds a verse, a verse range, and a cross-chapter range", () => {
    expect(buildTail("16", undefined, undefined)).toEqual({ verse: 16 });
    expect(buildTail("16", undefined, "18")).toEqual({
      verse: 16,
      endVerse: 18,
    });
    expect(buildTail("1", "2", "3")).toEqual({
      verse: 1,
      endChapter: 2,
      endVerse: 3,
    });
  });

  it("treats a bare end number as an end chapter", () => {
    expect(buildTail(undefined, undefined, "3")).toEqual({ endChapter: 3 });
  });

  it("rejects a chapter start mixed with a verse end", () => {
    expect(buildTail(undefined, "2", "3")).toBeNull();
  });
});
