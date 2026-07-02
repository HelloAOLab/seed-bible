import type { TranslationBook } from "./FreeUseBibleAPI";
import type { VerseRef } from "./PlaylistManager";

/** Normalizes a book name for comparison: lowercased, whitespace collapsed. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

  const normalizedName = normalize(bookName);
  const book = books.find(
    (b) =>
      normalize(b.commonName) === normalizedName ||
      normalize(b.name) === normalizedName ||
      normalize(b.id) === normalizedName
  );
  if (!book) {
    return null;
  }

  const chapter = Number(chapterStr);
  // A verse is required. Without one (e.g. "Genesis 1") the reference is invalid.
  if (!verseStr) {
    return null;
  }
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
