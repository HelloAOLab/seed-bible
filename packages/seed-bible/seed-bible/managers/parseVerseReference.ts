import type { TranslationBook } from "./FreeUseBibleAPI";
import type { VerseRef } from "./PlaylistManager";

/** Normalizes a book name for comparison: lowercased, whitespace collapsed. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolves a typed book name to a translation book. Tries, in order:
 * 1. An exact (case-insensitive) match on the book's common name, name, or id.
 * 2. A prefix match on the common name or name (e.g. "Phil" -> "Philippians"),
 *    but only when exactly one book matches — ambiguous prefixes yield `null`.
 */
function findBook(
  bookName: string,
  books: TranslationBook[]
): TranslationBook | null {
  const target = normalize(bookName);

  const exact = books.find(
    (b) =>
      normalize(b.commonName) === target ||
      normalize(b.name) === target ||
      normalize(b.id) === target
  );
  if (exact) {
    return exact;
  }

  const prefixMatches = books.filter(
    (b) =>
      normalize(b.commonName).startsWith(target) ||
      normalize(b.name).startsWith(target)
  );
  return prefixMatches.length === 1 ? prefixMatches[0]! : null;
}

/**
 * Parses a human-typed scripture reference (e.g. "John 3:16", "1 John 2:1-3",
 * "Genesis 1:1-2:3") into a {@link VerseRef}, matching the book name against the
 * provided translation books.
 *
 * Returns `null` when the book can't be matched or the format is invalid.
 * Both a chapter and a verse are required (matching `VerseRefSchema`), so a bare
 * "Genesis 1" yields `null`.
 */
export function parseVerseReference(
  input: string,
  books: TranslationBook[]
): VerseRef | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Split into the leading book-name portion and the trailing numeric portion.
  // The book name runs up to the first chapter number (the first digit that is
  // followed by more numeric/reference characters to the end of the string).
  const match = trimmed.match(
    /^(.+?)\s+(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+):)?(\d+))?$/
  );
  if (!match) {
    return null;
  }

  const [, bookName, chapterStr, verseStr, endChapterStr, endVerseStr] = match;

  // A book name, chapter, and verse are all required (matching `VerseRefSchema`).
  // A bare "Genesis 1" has no verse and is treated as invalid.
  if (!bookName || !chapterStr || !verseStr) {
    return null;
  }

  const book = findBook(bookName, books);
  if (!book) {
    return null;
  }

  const chapter = Number(chapterStr);
  const verse = Number(verseStr);

  const ref: VerseRef = {
    bookId: book.id,
    chapter,
    verse,
  };

  if (endVerseStr) {
    ref.endVerse = Number(endVerseStr);
  }
  if (endChapterStr) {
    ref.endChapter = Number(endChapterStr);
  }

  return ref;
}
