import { signal, type Signal } from "@preact/signals";
import type {
  BibleSelectedVerse,
  InterlinearWord,
  OriginalLanguage,
} from "seed-bible/managers";

export const WORD_STUDY_PANE_ID = "word-study-pane";

/**
 * Which order a verse's words are listed in: the original language's own
 * (`pos`), or the order the BSB's English puts them in (`bsbPos`).
 */
export type WordOrder = "original" | "english";

/** One verse the pane was opened on. */
export interface StudiedVerse {
  bookId: string;
  /** The book's name in the reader's translation, captured when the pane opened. */
  bookName: string;
  chapter: number;
  verse: number;
}

export interface WordStudyState {
  /**
   * The verses the pane shows, frozen when it opened. Following the live
   * selection instead would blank the pane on a phone, where it covers the
   * reader, and would show one chapter's words under another's heading if the
   * reader moved on.
   */
  verses: Signal<StudiedVerse[]>;
  order: Signal<WordOrder>;
  /**
   * The lexicon entries opened, as Strong's numbers, most recent last. Empty
   * shows the word list; otherwise the last entry's card is showing, and Back
   * returns to the one before it.
   */
  lexiconStack: Signal<string[]>;
  openLexicon(strongsId: string): void;
  back(): void;
  reset(): void;
}

export function createWordStudyState(): WordStudyState {
  const verses = signal<StudiedVerse[]>([]);
  // Kept across openings, unlike the rest: a reader who prefers English order
  // shouldn't have to pick it again for every verse.
  const order = signal<WordOrder>("original");
  const lexiconStack = signal<string[]>([]);

  return {
    verses,
    order,
    lexiconStack,
    openLexicon(strongsId) {
      lexiconStack.value = [...lexiconStack.value, strongsId];
    },
    back() {
      lexiconStack.value = lexiconStack.value.slice(0, -1);
    },
    reset() {
      verses.value = [];
      lexiconStack.value = [];
    },
  };
}

/** The selected verses, one entry each, in the order the reader selected them in the text. */
export function studiedVersesFromSelection(
  selected: BibleSelectedVerse[],
  bookName: (bookId: string) => string
): StudiedVerse[] {
  const seen = new Set<string>();
  const verses: StudiedVerse[] = [];
  for (const entry of selected) {
    const key = `${entry.bookId} ${entry.chapterNumber}:${entry.verse.number}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    verses.push({
      bookId: entry.bookId,
      bookName: bookName(entry.bookId),
      chapter: entry.chapterNumber,
      verse: entry.verse.number,
    });
  }
  return verses.sort(
    (a, b) =>
      // Book order isn't known here; a selection spans one book in practice,
      // so only chapter and verse decide.
      a.chapter - b.chapter || a.verse - b.verse
  );
}

/** "John 1:1". */
export function formatStudiedVerse(verse: StudiedVerse): string {
  return `${verse.bookName} ${verse.chapter}:${verse.verse}`;
}

/**
 * The pane title's reference: "John 1:1", "John 1:1–3", "John 1:1, 3", or
 * the first verse and an ellipsis when the selection spans chapters.
 */
export function formatStudiedReference(verses: StudiedVerse[]): string {
  const first = verses[0];
  if (!first) {
    return "";
  }
  const sameChapter = verses.every(
    (verse) => verse.bookId === first.bookId && verse.chapter === first.chapter
  );
  if (!sameChapter) {
    return `${formatStudiedVerse(first)}…`;
  }

  const ranges: string[] = [];
  let start = first.verse;
  let end = first.verse;
  for (const { verse } of verses.slice(1)) {
    if (verse === end + 1) {
      end = verse;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    start = end = verse;
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return `${first.bookName} ${first.chapter}:${ranges.join(", ")}`;
}

export function sortWords(
  words: InterlinearWord[],
  order: WordOrder
): InterlinearWord[] {
  const key = order === "english" ? "bsbPos" : "pos";
  return [...words].sort((a, b) => a[key] - b[key]);
}

/** Hebrew and Aramaic are written right to left; Greek left to right. */
export function isRightToLeft(language: OriginalLanguage): boolean {
  return language === "hebrew" || language === "aramaic";
}

/** The BCP 47 tag for an original language, so screen readers and fonts treat the text correctly. */
export function languageTag(language: OriginalLanguage): string {
  switch (language) {
    case "hebrew":
      return "hbo";
    case "aramaic":
      return "arc";
    case "greek":
      return "grc";
  }
}
