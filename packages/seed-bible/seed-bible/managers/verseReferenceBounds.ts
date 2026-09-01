import {
  getBookChapterCount,
  getChapterVerseCount,
} from "./bookChapterVerseCounts";
import type { TranslationBook } from "./FreeUseBibleAPI";

/** Whether the given chapter number falls within the book's chapter range. */
export function bookHasChapter(
  book: TranslationBook,
  chapter: number
): boolean {
  const first = book.firstChapterNumber;
  const last = first + book.numberOfChapters - 1;
  return chapter >= first && chapter <= last;
}

/**
 * Whether a resolved reference's chapter/verse numbers exist for the book.
 *
 * Chapter bounds prefer the current translation when `books` is provided;
 * otherwise they use static Protestant-canon chapter counts.
 *
 * Verse bounds use the static Protestant table only when no translation book
 * is available. TranslationBook has no per-chapter verse counts, so imposing
 * Protestant maxima on a loaded translation would reject valid Catholic/
 * Orthodox (and other) versifications. With a translation book present we
 * only require verse ≥ 1; chapter gating still kills impossible refs like
 * Genesis 999. Unknown books without static data likewise accept verse ≥ 1.
 */
export function isVerseReferenceInBounds(
  bookId: string,
  chapter: number,
  verse?: number,
  endChapter?: number,
  endVerse?: number,
  books?: TranslationBook[]
): boolean {
  const fromTranslation = books?.find((b) => b.id === bookId);
  const staticChapterCount = getBookChapterCount(bookId);

  const chapterInBook = (ch: number): boolean => {
    if (fromTranslation) {
      return bookHasChapter(fromTranslation, ch);
    }
    if (staticChapterCount !== undefined) {
      return ch >= 1 && ch <= staticChapterCount;
    }
    return ch >= 1;
  };

  if (!chapterInBook(chapter)) {
    return false;
  }

  const endCh = endChapter ?? chapter;
  if (endChapter !== undefined && !chapterInBook(endChapter)) {
    return false;
  }

  const verseInChapter = (ch: number, v: number): boolean => {
    if (v < 1) {
      return false;
    }
    // Translation metadata has no per-chapter verse counts — don't reject on
    // Protestant assumptions when a translation book is loaded.
    if (fromTranslation) {
      return true;
    }
    const max = getChapterVerseCount(bookId, ch);
    if (max === undefined) {
      return true;
    }
    return v <= max;
  };

  if (verse !== undefined && !verseInChapter(chapter, verse)) {
    return false;
  }
  if (endVerse !== undefined && !verseInChapter(endCh, endVerse)) {
    return false;
  }

  return true;
}
