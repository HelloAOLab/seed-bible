import { bookOrderIndex } from "./books";
import type { GuessResult, VersePosition } from "./types";

export function guessKey(guess: VersePosition): string {
  return `${guess.bookId}:${guess.chapterNumber}:${guess.verseNumber}`;
}

/**
 * Guesses for one play-through.
 *
 * The selection already on a reader when that reader becomes the one in play
 * is not a guess: it was there before Play, or the player switched to a tab
 * that already had one. Tapping that verse afterwards still counts. Tapping
 * a verse that was already guessed shows the feedback again without spending
 * another chance.
 */
export class PlayGuesses {
  private seen = new Set<string>();
  private session: object | null = null;

  stop(): void {
    this.seen.clear();
    this.session = null;
  }

  observe(
    session: object,
    selection: VersePosition | null
  ): { guess: VersePosition; spendChance: boolean } | null {
    if (this.session !== session) {
      this.session = session;
      return null;
    }
    if (!selection) return null;
    const key = guessKey(selection);
    const spendChance = !this.seen.has(key);
    this.seen.add(key);
    return { guess: selection, spendChance };
  }
}

export function evaluateGuess(
  target: VersePosition,
  guess: VersePosition
): GuessResult {
  const ti = bookOrderIndex(target.bookId);
  const gi = bookOrderIndex(guess.bookId);

  // Compare ids, not only indexes. Two books the catalog can't place both
  // come back as -1, and treating that as "the same book" would tell the
  // player they had the book right.
  if (guess.bookId !== target.bookId) {
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
 * Guesses required before Reveal appears. Half the chances, rounded up:
 * 7 chances reveals after 4, 6 chances after 3.
 */
export function revealThreshold(totalChances: number): number {
  return Math.ceil(totalChances / 2);
}

function isWordToken(token: string): boolean {
  return token.trim().length > 0;
}

/** Fisher-Yates. Sorting by `Math.random() - 0.5` does not pick words evenly. */
function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = current;
  }
  return copy;
}

/**
 * Replaces roughly half of the words in a verse with blanks, chosen at
 * random, to give a partial hint without giving the answer away.
 */
export function buildPartialReveal(verseText: string): string {
  if (!verseText) return "";
  const words = verseText.split(/(\s+)/);
  // A leading space makes the first token empty. That is spacing, not a word,
  // and must not become a blank of its own.
  const wordIndices = words
    .map((token, index) => (isWordToken(token) ? index : -1))
    .filter((index) => index >= 0);
  if (wordIndices.length === 0) return verseText;
  const revealCount = Math.ceil(wordIndices.length / 2);
  const revealed = new Set(shuffle(wordIndices).slice(0, revealCount));
  return words
    .map((token, index) => {
      if (!isWordToken(token)) return token;
      return revealed.has(index) ? token : "___";
    })
    .join("");
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function resultMessage(result: GuessResult, t: Translate): string {
  switch (result.kind) {
    case "wrong_book":
      return result.direction === "after"
        ? t("guess-later-book", {
            ns: "find-the-verse-extension",
            defaultValue:
              "The verse is later in the Bible — try a book further along.",
          })
        : t("guess-earlier-book", {
            ns: "find-the-verse-extension",
            defaultValue:
              "The verse is earlier in the Bible — try a book further back.",
          });
    case "wrong_chapter":
      return result.direction === "after"
        ? t("guess-later-chapter", {
            ns: "find-the-verse-extension",
            defaultValue: "Right book! The verse is in a later chapter.",
          })
        : t("guess-earlier-chapter", {
            ns: "find-the-verse-extension",
            defaultValue: "Right book! The verse is in an earlier chapter.",
          });
    case "wrong_verse":
      return result.direction === "after"
        ? t("guess-higher-verse", {
            ns: "find-the-verse-extension",
            defaultValue: "Right chapter! The verse number is higher.",
          })
        : t("guess-lower-verse", {
            ns: "find-the-verse-extension",
            defaultValue: "Right chapter! The verse number is lower.",
          });
    case "correct":
      return t("you-found-it", {
        ns: "find-the-verse-extension",
        defaultValue: "You found it!",
      });
  }
}
