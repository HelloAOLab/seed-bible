import { getBookId } from "./BibleDataManager";
import {
  exactTranslationBook,
  normalizeBookName,
  prefixTranslationBooks,
} from "./bookNameMatch";
import type { TranslationBook } from "./FreeUseBibleAPI";
import type { VerseRef } from "./PlaylistManager";
import { bookHasChapter } from "./verseReferenceBounds";
import { buildTail, splitTypedVerseReference } from "./verseReferenceSyntax";

export { bookHasChapter } from "./verseReferenceBounds";
export {
  buildTail,
  splitTypedVerseReference,
  type ReferenceTail,
} from "./verseReferenceSyntax";

/**
 * Parses a human-typed scripture reference (e.g. "John 3:16", "John 3.16",
 * "Gen.1.1", "1 John 2:1-3", "Genesis 1:1-2:3") into every {@link VerseRef} it
 * could plausibly mean. Colon and period are interchangeable chapter-verse
 * separators; the book may be joined to the chapter by a space or a period.
 *
 * Distinct from {@link scanVerseReferencesInText} in BibleDataManager, which
 * finds every reference embedded in free prose (chat, footnotes).
 *
 * The verse may be omitted to reference a whole chapter, so a bare "Genesis 1"
 * yields `{ bookId, chapter }`, and a chapter range like "John 1-3" yields
 * `{ bookId, chapter: 1, endChapter: 3 }`. Mixing a chapter start with a verse
 * end (e.g. "John 1-2:3") is invalid and yields an empty list.
 *
 * Book matching, in order:
 * 1. When `books` is provided, an exact (case-insensitive) match on a book's
 *    common name, name, or id; otherwise a prefix match on the common name or
 *    name. Localized names from the current translation are found here (e.g.
 *    spa_onbv "Esdras" → EZR).
 * 2. Otherwise, the canonical English book name or USFM/book id via
 *    {@link getBookId}. When `books` is still available, the matched id is
 *    re-resolved against that list so single-chapter verse shorthand still
 *    works.
 *
 * An exact match resolves to a single book. When a prefix matches several books
 * (e.g. "Phil" -> Philippians and Philemon), each book that actually contains
 * the requested chapter becomes a separate result — so "Phil 2" yields only
 * Philippians (Philemon has one chapter) while "Phil 1" yields both.
 *
 * For a book that has only one chapter and is named unambiguously, a bare
 * trailing number is read as a verse rather than a chapter, so "Philemon 2"
 * yields `{ bookId, chapter: 1, verse: 2 }` and "Jude 3" yields Jude 1:3.
 *
 * Returns an empty list when the book can't be matched or the format is
 * invalid.
 */
export function parseVerseReferenceCandidates(
  input: string,
  books?: TranslationBook[]
): VerseRef[] {
  const split = splitTypedVerseReference(input);
  if (!split) {
    return [];
  }

  const {
    bookQuery: bookName,
    chapterStr,
    verseStr,
    endChapterStr,
    endVerseStr,
  } = split;

  // A book name and chapter are always required.
  if (!bookName || !chapterStr) {
    return [];
  }

  const tail = buildTail(verseStr, endChapterStr, endVerseStr);
  if (tail === null) {
    return [];
  }

  const chapter = Number(chapterStr);
  const isBareNumber = !verseStr && !endChapterStr && !endVerseStr;

  const target = normalizeBookName(bookName);
  let nameMatches: TranslationBook[] = [];
  if (books?.length) {
    const exact = exactTranslationBook(target, books);
    // An exact match resolves to a single book; otherwise every prefix match is a
    // candidate to be narrowed by chapter below.
    nameMatches = exact ? [exact] : prefixTranslationBooks(target, books);
  }

  if (nameMatches.length === 0) {
    // Fall back to English names / book ids. If the translation list is still
    // available, recover book metadata so single-chapter verse shorthand works.
    const bookId = getBookId(bookName);
    if (!bookId) {
      return [];
    }
    const byId = books?.find((b) => b.id === bookId);
    if (byId) {
      nameMatches = [byId];
    } else {
      return [{ bookId, chapter, ...tail }];
    }
  }

  if (nameMatches.length === 1) {
    // The name is unambiguous. A bare number against a single-chapter book is
    // read as a verse in chapter 1 (e.g. "Philemon 2" -> Philemon 1:2).
    const book = nameMatches[0]!;
    if (isBareNumber && book.numberOfChapters === 1) {
      return [
        { bookId: book.id, chapter: book.firstChapterNumber, verse: chapter },
      ];
    }
    return [{ bookId: book.id, chapter, ...tail }];
  }

  // Several books share the prefix. The verse shorthand needs an unambiguous
  // name, so it doesn't apply; instead keep every book that actually contains
  // the requested chapter, each as its own candidate.
  return nameMatches
    .filter((book) => bookHasChapter(book, chapter))
    .map((book) => ({ bookId: book.id, chapter, ...tail }));
}

/**
 * Parses a human-typed scripture reference into a single {@link VerseRef}.
 *
 * Thin wrapper over {@link parseVerseReferenceCandidates}: returns the match
 * when it is unambiguous (exactly one), and `null` when the reference can't be
 * matched or is ambiguous (matches more than one book, e.g. "Phil 1" ->
 * Philippians and Philemon). See {@link parseVerseReferenceCandidates} for the
 * matching rules.
 *
 * Distinct from {@link scanVerseReferencesInText} in BibleDataManager, which
 * finds every reference embedded in free prose (chat, footnotes).
 */
export function parseSingleVerseReference(
  input: string,
  books?: TranslationBook[]
): VerseRef | null {
  const refs = parseVerseReferenceCandidates(input, books);
  return refs.length === 1 ? refs[0]! : null;
}
