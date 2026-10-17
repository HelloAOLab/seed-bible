import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bookDisplayName,
  bookOrderIndex,
  isKnownBookId,
} from "@packages/find-the-verse-extension/ext_FindTheVerse/books";
import {
  buildPartialReveal,
  evaluateGuess,
  PlayGuesses,
  revealThreshold,
} from "@packages/find-the-verse-extension/ext_FindTheVerse/gameLogic";
import type { VersePosition } from "@packages/find-the-verse-extension/ext_FindTheVerse/types";

const john: VersePosition = {
  bookId: "JHN",
  chapterNumber: 3,
  verseNumber: 16,
};

describe("evaluateGuess", () => {
  it("says a guess in an earlier book is later in the Bible", () => {
    expect(
      evaluateGuess(john, {
        bookId: "GEN",
        chapterNumber: 1,
        verseNumber: 1,
      })
    ).toEqual({ kind: "wrong_book", direction: "after" });
  });

  it("says a guess in a later book is earlier in the Bible", () => {
    expect(
      evaluateGuess(john, {
        bookId: "REV",
        chapterNumber: 1,
        verseNumber: 1,
      })
    ).toEqual({ kind: "wrong_book", direction: "before" });
  });

  it("places books outside the Protestant 66, such as Tobit, in the app's order", () => {
    expect(bookOrderIndex("TOB")).toBeGreaterThan(bookOrderIndex("GEN"));
    expect(bookOrderIndex("NOPE")).toBe(-1);
    expect(
      evaluateGuess(
        { bookId: "TOB", chapterNumber: 1, verseNumber: 1 },
        { bookId: "GEN", chapterNumber: 1, verseNumber: 1 }
      )
    ).toEqual({ kind: "wrong_book", direction: "after" });
  });

  it("does not call two unknown books the same book", () => {
    expect(
      evaluateGuess(
        { bookId: "ZZZ", chapterNumber: 2, verseNumber: 2 },
        { bookId: "YYY", chapterNumber: 1, verseNumber: 1 }
      ).kind
    ).toBe("wrong_book");
  });

  it("compares chapter, then verse, inside the right book", () => {
    expect(
      evaluateGuess(john, {
        bookId: "JHN",
        chapterNumber: 1,
        verseNumber: 1,
      })
    ).toEqual({ kind: "wrong_chapter", direction: "after" });
    expect(
      evaluateGuess(john, {
        bookId: "JHN",
        chapterNumber: 10,
        verseNumber: 1,
      })
    ).toEqual({ kind: "wrong_chapter", direction: "before" });
    expect(
      evaluateGuess(john, {
        bookId: "JHN",
        chapterNumber: 3,
        verseNumber: 1,
      })
    ).toEqual({ kind: "wrong_verse", direction: "after" });
    expect(
      evaluateGuess(john, {
        bookId: "JHN",
        chapterNumber: 3,
        verseNumber: 20,
      })
    ).toEqual({ kind: "wrong_verse", direction: "before" });
    expect(evaluateGuess(john, john)).toEqual({ kind: "correct" });
  });
});

describe("book names", () => {
  it("uses the translation's name, then a name from the canonical slug", () => {
    expect(isKnownBookId("JHN")).toBe(true);
    expect(isKnownBookId("Jhon")).toBe(false);
    expect(
      bookDisplayName("JHN", [{ id: "JHN", name: "Juan", commonName: "John" }])
    ).toBe("Juan");
    expect(bookDisplayName("JHN", [{ id: "JHN", commonName: "John" }])).toBe(
      "John"
    );
    expect(bookDisplayName("JHN")).toBe("John");
    expect(bookDisplayName("1SA")).toBe("1 Samuel");
    expect(bookDisplayName("NOT-A-BOOK")).toBe("NOT-A-BOOK");
  });
});

describe("revealThreshold", () => {
  it("is half the chances, rounded up", () => {
    expect(revealThreshold(7)).toBe(4);
    expect(revealThreshold(6)).toBe(3);
    expect(revealThreshold(1)).toBe(1);
    expect(revealThreshold(0)).toBe(0);
  });
});

describe("buildPartialReveal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hides about half the words and ignores a leading space", () => {
    const result = buildPartialReveal(" one two");
    expect(result.startsWith("___")).toBe(false);
    expect(result.match(/___/g)).toHaveLength(1);
    expect(buildPartialReveal("")).toBe("");
    expect(buildPartialReveal("   ")).toBe("   ");
  });

  it("reveals a chosen half of the words", () => {
    const random = vi.spyOn(Math, "random");
    random.mockReturnValueOnce(0.9).mockReturnValueOnce(0.1).mockReturnValue(0);
    expect(buildPartialReveal("one two three four")).toBe("___ two three ___");
  });
});

describe("PlayGuesses", () => {
  const verse: VersePosition = {
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: 1,
  };
  const other: VersePosition = {
    bookId: "EXO",
    chapterNumber: 1,
    verseNumber: 1,
  };

  it("ignores the selection already on screen, then charges a verse only once", () => {
    const play = new PlayGuesses();
    const reader = {};

    expect(play.observe(reader, verse)).toBeNull();
    expect(play.observe(reader, null)).toBeNull();
    expect(play.observe(reader, verse)).toEqual({
      guess: verse,
      spendChance: true,
    });
    expect(play.observe(reader, verse)).toEqual({
      guess: verse,
      spendChance: false,
    });
    expect(play.observe(reader, other)?.spendChance).toBe(true);

    const otherReader = {};
    expect(play.observe(otherReader, other)).toBeNull();
    expect(play.observe(otherReader, other)?.spendChance).toBe(false);

    play.stop();
    expect(play.observe(reader, verse)).toBeNull();
    expect(play.observe(reader, verse)?.spendChance).toBe(true);
  });
});
