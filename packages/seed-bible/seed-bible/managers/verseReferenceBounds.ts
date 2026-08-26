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
 * Prefers the current translation's chapter range when `books` is provided;
 * otherwise (and for per-chapter verse counts) falls back to static
 * Protestant-canon bounds. Unknown books (e.g. apocrypha without static data)
 * only reject clearly impossible numbers (chapter/verse < 1).
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
    const max = getChapterVerseCount(bookId, ch);
    if (max === undefined) {
      // No static verse data (and TranslationBook has none) — accept verse ≥ 1.
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
