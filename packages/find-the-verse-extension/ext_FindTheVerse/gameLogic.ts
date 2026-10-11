import { bookOrderIndex } from "./books";
import type { GuessResult, VersePosition } from "./types";

export function evaluateGuess(
  target: VersePosition,
  guess: VersePosition
): GuessResult {
  const ti = bookOrderIndex(target.bookId);
  const gi = bookOrderIndex(guess.bookId);

  if (gi !== ti) {
    return { kind: "wrong_book", direction: gi < ti ? "after" : "before" };
  }
  if (guess.chapterNumber !== target.chapterNumber) {
    return {
      kind: "wrong_chapter",
      direction:
        guess.chapterNumber < target.chapterNumber ? "after" : "before",
    };
  }
  if (guess.verseNumber !== target.verseNumber) {
    return {
      kind: "wrong_verse",
      direction: guess.verseNumber < target.verseNumber ? "after" : "before",
    };
  }
  return { kind: "correct" };
}

/**
 * The number of guesses that must be used before the Reveal button appears.
 * Uses Math.ceil so for 7 chances the button appears after 4 guesses — the
 * player has exhausted strictly more than half before getting help.
 */
export function revealThreshold(totalChances: number): number {
  return Math.ceil(totalChances / 2);
}

/**
 * Replaces roughly half of the words in a verse with blanks, chosen at
 * random, to give a partial hint without giving the answer away.
 */
export function buildPartialReveal(verseText: string): string {
  if (!verseText) return "";
  const words = verseText.split(/(\s+)/);
  // Only operate on actual word tokens (odd-indexed are separators)
  const wordIndices = words
    .map((w, i) => (i % 2 === 0 ? i : -1))
    .filter((i) => i >= 0);
  const revealCount = Math.ceil(wordIndices.length / 2);
  // Pick a random subset to reveal, shuffle and slice
  const shuffled = [...wordIndices].sort(() => Math.random() - 0.5);
  const revealed = new Set(shuffled.slice(0, revealCount));
  return words
    .map((token, i) => {
      if (i % 2 !== 0) return token; // preserve spacing
      return revealed.has(i) ? token : "___";
    })
    .join("");
}

export function resultMessage(result: GuessResult): string {
  switch (result.kind) {
    case "wrong_book":
      return result.direction === "after"
        ? "The verse is later in the Bible — try a book further along."
        : "The verse is earlier in the Bible — try a book further back.";
    case "wrong_chapter":
      return result.direction === "after"
        ? "Right book! The verse is in a later chapter."
        : "Right book! The verse is in an earlier chapter.";
    case "wrong_verse":
      return result.direction === "after"
        ? "Right chapter! The verse number is higher."
        : "Right chapter! The verse number is lower.";
    case "correct":
      return "You found it!";
  }
}
