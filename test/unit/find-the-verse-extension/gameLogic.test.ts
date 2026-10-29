import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bookDisplayName,
  formatReference,
  bookOrderIndex,
  isKnownBookId,
} from "@packages/find-the-verse-extension/ext_FindTheVerse/books";
import {
  bookOutOfRange,
  buildPartialReveal,
  chapterOutOfRange,
  evaluateGuess,
  countFilledHints,
  openSearchWindow,
  PlayGuesses,
  revealThreshold,
  rangeHighlightCss,
  tightenWindow,
  versesOutOfRange,
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
    expect(formatReference("JHN", 1, 1, [{ id: "JHN", name: "Juan" }])).toBe(
      "Juan 1:1"
    );
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

describe("search window", () => {
  const target: VersePosition = {
    bookId: "GEN",
    chapterNumber: 5,
    verseNumber: 16,
  };
  const genesis = bookOrderIndex("GEN");
  const exodus = bookOrderIndex("EXO");

  it("drops the whole chapter after a too-early chapter guess", () => {
    const guess: VersePosition = {
      bookId: "GEN",
      chapterNumber: 3,
      verseNumber: 10,
    };
    const window = tightenWindow(
      openSearchWindow(),
      guess,
      evaluateGuess(target, guess)
    );

    expect(window.before).toBeNull();
    expect(window.after).toEqual({
      bookIndex: genesis,
      chapterNumber: 3,
      verseNumber: Number.POSITIVE_INFINITY,
    });
    expect(versesOutOfRange(window, "GEN", 3, [1, 10, 11, 12])).toEqual([
      1, 10, 11, 12,
    ]);
    expect(chapterOutOfRange(window, genesis, 2)).toBe(true);
    expect(chapterOutOfRange(window, genesis, 3)).toBe(true);
    expect(chapterOutOfRange(window, genesis, 5)).toBe(false);
    expect(bookOutOfRange(window, genesis, 50)).toBe(false);
    expect(bookOutOfRange(window, exodus, 40)).toBe(false);
  });

  it("drops the whole book after a too-early book guess", () => {
    const ruth: VersePosition = {
      bookId: "RUT",
      chapterNumber: 1,
      verseNumber: 16,
    };
    const guess: VersePosition = {
      bookId: "GEN",
      chapterNumber: 1,
      verseNumber: 1,
    };
    const window = tightenWindow(
      openSearchWindow(),
      guess,
      evaluateGuess(ruth, guess)
    );

    expect(bookOutOfRange(window, genesis, 50)).toBe(true);
    expect(chapterOutOfRange(window, genesis, 1)).toBe(true);
    expect(chapterOutOfRange(window, genesis, 50)).toBe(true);
    expect(bookOutOfRange(window, bookOrderIndex("RUT"), 4)).toBe(false);
  });

  it("cuts the far end when a later guess is too far ahead, and does not widen", () => {
    const early: VersePosition = {
      bookId: "GEN",
      chapterNumber: 3,
      verseNumber: 10,
    };
    const late: VersePosition = {
      bookId: "EXO",
      chapterNumber: 1,
      verseNumber: 1,
    };
    const narrowed = tightenWindow(
      tightenWindow(openSearchWindow(), early, evaluateGuess(target, early)),
      late,
      evaluateGuess(target, late)
    );
    const behind: VersePosition = {
      bookId: "GEN",
      chapterNumber: 1,
      verseNumber: 1,
    };

    expect(narrowed.before).toEqual({
      bookIndex: exodus,
      chapterNumber: 0,
      verseNumber: 0,
    });
    expect(bookOutOfRange(narrowed, exodus, 40)).toBe(true);
    expect(versesOutOfRange(narrowed, "GEN", 3, [11])).toEqual([11]);
    expect(
      tightenWindow(narrowed, behind, evaluateGuess(target, behind)).after
    ).toEqual(narrowed.after);
  });
});

describe("countFilledHints", () => {
  it("counts only chances that have a hint", () => {
    expect(
      countFilledHints([
        { hint: "a" },
        { hint: "  " },
        { hint: "b" },
        { hint: "" },
      ])
    ).toBe(2);
  });
});

describe("rangeHighlightCss", () => {
  it("hides reader highlights and the tap underline while a round is on", () => {
    const css = rangeHighlightCss([], []);
    expect(css).toContain(".sb-highlight-layer");
    expect(css).toContain(".sb-verse-decoration-diminish");
  });
});
