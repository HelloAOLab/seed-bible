import { bookOrderIndex } from "./books";
import type {
  BibleSpot,
  GuessResult,
  SearchWindow,
  VersePosition,
} from "./types";

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

export function openSearchWindow(): SearchWindow {
  return { after: null, before: null };
}

function compareSpots(a: BibleSpot, b: BibleSpot): number {
  if (a.bookIndex !== b.bookIndex) return a.bookIndex < b.bookIndex ? -1 : 1;
  if (a.chapterNumber !== b.chapterNumber) {
    return a.chapterNumber < b.chapterNumber ? -1 : 1;
  }
  if (a.verseNumber === b.verseNumber) return 0;
  return a.verseNumber < b.verseNumber ? -1 : 1;
}

const OPEN_END = Number.POSITIVE_INFINITY;

/**
 * The furthest spot this guess rules out. A wrong book drops the whole book,
 * and a wrong chapter drops the whole chapter. A wrong verse drops only that
 * verse. `Infinity` is the far edge, so the selector can grey a book without
 * knowing how many chapters it has.
 */
function ruledOutSpot(
  guess: VersePosition,
  result: Exclude<GuessResult, { kind: "correct" }>,
  bookIndex: number
): BibleSpot {
  const after = result.direction === "after";
  if (result.kind === "wrong_book") {
    return {
      bookIndex,
      chapterNumber: after ? OPEN_END : 0,
      verseNumber: after ? OPEN_END : 0,
    };
  }
  if (result.kind === "wrong_chapter") {
    return {
      bookIndex,
      chapterNumber: guess.chapterNumber,
      verseNumber: after ? OPEN_END : 0,
    };
  }
  return {
    bookIndex,
    chapterNumber: guess.chapterNumber,
    verseNumber: guess.verseNumber,
  };
}

/**
 * Pulls the window in around a wrong guess. The new edge is the end of what
 * the feedback ruled out, not only the verse that was tapped. A later guess
 * only moves a bound inward.
 */
export function tightenWindow(
  window: SearchWindow,
  guess: VersePosition,
  result: GuessResult
): SearchWindow {
  if (result.kind === "correct") return window;
  const bookIndex = bookOrderIndex(guess.bookId);
  if (bookIndex < 0) return window;
  const spot = ruledOutSpot(guess, result, bookIndex);
  if (result.direction === "after") {
    const after =
      window.after && compareSpots(window.after, spot) > 0
        ? window.after
        : spot;
    return { ...window, after };
  }
  const before =
    window.before && compareSpots(window.before, spot) < 0
      ? window.before
      : spot;
  return { ...window, before };
}

/** True when this exact verse can still be the answer. */
export function verseInWindow(
  window: SearchWindow,
  bookId: string,
  chapterNumber: number,
  verseNumber: number
): boolean {
  const bookIndex = bookOrderIndex(bookId);
  if (bookIndex < 0) return true;
  const spot: BibleSpot = { bookIndex, chapterNumber, verseNumber };
  if (window.after && compareSpots(spot, window.after) <= 0) return false;
  if (window.before && compareSpots(spot, window.before) >= 0) return false;
  return true;
}

const OPEN_ENDED_VERSE = Number.POSITIVE_INFINITY;

function spanMissesWindow(
  window: SearchWindow,
  first: BibleSpot,
  last: BibleSpot
): boolean {
  if (window.before && compareSpots(first, window.before) >= 0) return true;
  if (window.after && compareSpots(last, window.after) <= 0) return true;
  return false;
}

/** The whole book is outside the window, so the selector can grey its row. */
export function bookOutOfRange(
  window: SearchWindow,
  bookIndex: number,
  chapterCount: number
): boolean {
  if (bookIndex < 0 || chapterCount < 1) return false;
  return spanMissesWindow(
    window,
    { bookIndex, chapterNumber: 1, verseNumber: 1 },
    {
      bookIndex,
      chapterNumber: chapterCount,
      verseNumber: OPEN_ENDED_VERSE,
    }
  );
}

/** Every verse of this chapter is outside the window. */
export function chapterOutOfRange(
  window: SearchWindow,
  bookIndex: number,
  chapterNumber: number
): boolean {
  if (bookIndex < 0 || chapterNumber < 1) return false;
  return spanMissesWindow(
    window,
    { bookIndex, chapterNumber, verseNumber: 1 },
    { bookIndex, chapterNumber, verseNumber: OPEN_ENDED_VERSE }
  );
}

export function versesOutOfRange(
  window: SearchWindow,
  bookId: string,
  chapterNumber: number,
  verseNumbers: readonly number[]
): number[] {
  return verseNumbers.filter(
    (verseNumber) => !verseInWindow(window, bookId, chapterNumber, verseNumber)
  );
}

/**
 * Index of the first chance with no hint, or null when every chance has one.
 * An empty chance at the end counts too: it has to be filled or deleted.
 */
export function firstEmptyHint(
  steps: readonly { hint: string }[]
): number | null {
  const index = steps.findIndex((step) => step.hint.trim().length === 0);
  return index === -1 ? null : index;
}

const GREY =
  "color-mix(in srgb, var(--sb-font-color) 42%, var(--sb-book-selector-background, var(--sb-background, transparent)))";

/**
 * Theme-mixed grey for books and chapters the current window has ruled out.
 * Also hides the reader's highlights and the tap underline for the whole
 * round. The sheet is removed when the round ends, so both come back.
 */
export function rangeHighlightCss(
  bookIds: readonly string[],
  chapters: readonly number[]
): string {
  const rules = [
    ".sb-verse:has(.ftv-out-of-range) { opacity: 0.35; }",
    ".sb-verse:has(.sb-verse-decoration-diminish) { opacity: 1; }",
    ".sb-bible-reader .sb-highlight-layer { display: none !important; }",
    ".sb-bible-reader .sb-highlight { color: inherit !important; }",
    ".sb-bible-reader .sb-verse-selected .sb-verse-decorator { border-bottom: none !important; text-decoration: none !important; }",
  ];
  for (const id of bookIds) {
    if (!/^[A-Za-z0-9]+$/.test(id)) continue;
    const row = `#booktab-${id}`;
    rules.push(
      `${row}.sidebar-itm, ${row}.sidebar-itm:hover, ${row}.sidebar-selected-itm, ${row}.sidebar-selected-itm:hover { color: ${GREY}; }`,
      `${row} .material-symbols-outlined { color: color-mix(in srgb, var(--sb-font-color) 35%, transparent); }`
    );
  }
  for (const chapter of chapters) {
    if (!Number.isInteger(chapter) || chapter < 1) continue;
    const button = `#chapter-btn-${chapter}`;
    rules.push(
      `${button}.chapter-btn, ${button}.chapter-btn:hover, ${button}.chapter-btn-current { color: ${GREY}; background-color: color-mix(in srgb, var(--sb-secondary-color) 16%, transparent); }`
    );
  }
  return rules.join("\n");
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
