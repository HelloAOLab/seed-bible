import { signal, type Signal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible";
import type { InterlinearVerse, OriginalLanguage } from "seed-bible/managers";
import { isRightToLeft, type WordOrder } from "./wordStudyState";

export const CHAPTER_INTERLINEAR_PANE_ID = "word-study-chapter-pane";

/** The chapter the reader is on, which the chapter view follows. */
export interface ChapterPosition {
  bookId: string;
  /** The book's name in the reader's translation. */
  bookName: string;
  chapter: number;
}

export interface ChapterInterlinearState {
  /** Shared with the verse pane, so a reader picks their order once. */
  order: Signal<WordOrder>;
  /** As in the verse pane: the lexicon entries opened, most recent last. */
  lexiconStack: Signal<string[]>;
  /**
   * The verse to bring into view once its chapter has loaded, then cleared:
   * where the reader was when the view opened.
   */
  scrollToVerse: Signal<number | null>;
  openLexicon(strongsId: string): void;
  back(): void;
  reset(): void;
}

export function createChapterInterlinearState(
  order: Signal<WordOrder>
): ChapterInterlinearState {
  const lexiconStack = signal<string[]>([]);
  const scrollToVerse = signal<number | null>(null);

  return {
    order,
    lexiconStack,
    scrollToVerse,
    openLexicon(strongsId) {
      lexiconStack.value = [...lexiconStack.value, strongsId];
    },
    back() {
      lexiconStack.value = lexiconStack.value.slice(0, -1);
    },
    reset() {
      lexiconStack.value = [];
      scrollToVerse.value = null;
    },
  };
}

/** The reader's book and chapter, or null while no chapter is open (the Today page). */
export function chapterPositionOf(
  current: SeedBibleState["app"]["currentReadingState"]["value"]
): ChapterPosition | null {
  if (!current?.bookId || !current.chapterNumber) {
    return null;
  }
  const { bookId, chapterNumber } = current;
  const books = current.tab.readingState.translationBooks.value?.books ?? [];
  const book = books.find((entry) => entry.id === bookId);
  return {
    bookId,
    bookName: book?.commonName || book?.name || bookId,
    chapter: chapterNumber,
  };
}

/**
 * Where the reader is in their chapter: the first verse they selected, else
 * the first verse on screen, else null for the top.
 */
export function readerVerseOf(
  current: SeedBibleState["app"]["currentReadingState"]["value"]
): number | null {
  const readingState = current?.tab.readingState;
  if (!readingState) {
    return null;
  }
  const selected = readingState.selectedVerses
    .peek()
    .map((entry) => entry.verse.number);
  if (selected.length > 0) {
    return Math.min(...selected);
  }
  return readingState.visibleVerseRange.peek()?.first ?? null;
}

/** The chapter's language, from its first word. */
export function chapterLanguage(
  verses: InterlinearVerse[]
): OriginalLanguage | null {
  for (const verse of verses) {
    const word = verse.words[0];
    if (word) {
      return word.language;
    }
  }
  return null;
}

/**
 * Which way the word blocks run. Hebrew and Aramaic run right to left in
 * their own order; in English order the blocks follow the English sentence,
 * so they run left to right whatever the language.
 */
export function chapterDirection(
  language: OriginalLanguage | null,
  order: WordOrder
): "rtl" | "ltr" {
  return order === "original" && language && isRightToLeft(language)
    ? "rtl"
    : "ltr";
}

/** The lines under each word that a reader can hide. The original word always shows. */
export const INTERLINEAR_LINES = [
  "transliteration",
  "gloss",
  "strongs",
  "parsing",
] as const;

export type InterlinearLine = (typeof INTERLINEAR_LINES)[number];

/** Each line's setting in extension.json. */
export const INTERLINEAR_LINE_SETTINGS: Record<InterlinearLine, string> = {
  transliteration: "showTransliteration",
  gloss: "showGloss",
  strongs: "showStrongs",
  parsing: "showParsing",
};

export interface InterlinearLines {
  isShown(line: InterlinearLine): boolean;
  /** Shows or hides a line, saving the choice to the reader's settings. */
  setShown(line: InterlinearLine, shown: boolean): Promise<void>;
}

/**
 * The line toggles, kept in the extension's settings so they follow a
 * signed-in reader between devices and appear in Settings too.
 *
 * Settings only save for a signed-in reader, so a toggle is also held for the
 * session until its setting reads back the same value. A signed-out reader's
 * toggles still work; they last until the page reloads.
 */
export function createInterlinearLines(
  extensionId: string,
  settings: Pick<SeedBibleState["extensionSettings"], "getValue" | "setValue">
): InterlinearLines {
  const overrides = signal<Partial<Record<InterlinearLine, boolean>>>({});

  return {
    isShown(line) {
      const override = overrides.value[line];
      if (override !== undefined) {
        return override;
      }
      const stored = settings.getValue(
        extensionId,
        INTERLINEAR_LINE_SETTINGS[line]
      );
      return typeof stored === "boolean" ? stored : true;
    },
    async setShown(line, shown) {
      overrides.value = { ...overrides.value, [line]: shown };
      await settings.setValue(
        extensionId,
        INTERLINEAR_LINE_SETTINGS[line],
        shown
      );
      const isSaved =
        settings.getValue(extensionId, INTERLINEAR_LINE_SETTINGS[line]) ===
        shown;
      // A later toggle of the same line owns the override now.
      if (isSaved && overrides.value[line] === shown) {
        const rest = { ...overrides.value };
        delete rest[line];
        overrides.value = rest;
      }
    },
  };
}
