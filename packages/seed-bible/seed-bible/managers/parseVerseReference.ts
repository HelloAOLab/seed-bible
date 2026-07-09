import type { TranslationBook } from "./FreeUseBibleAPI";
import type { VerseRef } from "./PlaylistManager";

/** Normalizes a book name for comparison: lowercased, whitespace collapsed. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Whether the given chapter number falls within the book's chapter range. */
function bookHasChapter(book: TranslationBook, chapter: number): boolean {
  const first = book.firstChapterNumber;
  const last = first + book.numberOfChapters - 1;
  return chapter >= first && chapter <= last;
}

/**
 * Resolves a typed book name to a translation book. Tries, in order:
 * 1. An exact (case-insensitive) match on the book's common name, name, or id.
 * 2. A prefix match on the common name or name (e.g. "Phil" -> "Philippians").
 *    A single match wins outright. When several books share the prefix, the
 *    requested `chapter` breaks the tie: if exactly one of them actually has
 *    that chapter, it's chosen (e.g. "Phil 2" -> Philippians, since Philemon
 *    has only one chapter). Otherwise the prefix stays ambiguous and yields
 *    `null`.
 */
function findBook(
  bookName: string,
  books: TranslationBook[],
  chapter: number
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
  if (prefixMatches.length === 1) {
    return prefixMatches[0]!;
  }
  if (prefixMatches.length > 1) {
    // Several books share the prefix; keep only those that contain the
    // requested chapter. A unique survivor resolves the ambiguity.
    const withChapter = prefixMatches.filter((b) => bookHasChapter(b, chapter));
    if (withChapter.length === 1) {
      return withChapter[0]!;
    }
  }
  return null;
}

/**
 * Parses a human-typed scripture reference (e.g. "John 3:16", "1 John 2:1-3",
 * "Genesis 1:1-2:3") into a {@link VerseRef}, matching the book name against the
 * provided translation books.
 *
 * The verse may be omitted to reference a whole chapter, so a bare "Genesis 1"
 * yields `{ bookId, chapter }`, and a chapter range like "John 1-3" yields
 * `{ bookId, chapter: 1, endChapter: 3 }`. Mixing a chapter start with a verse
 * end (e.g. "John 1-2:3") is ambiguous and treated as invalid.
 *
 * When a shortened book name matches more than one book (e.g. "Phil" ->
 * Philippians and Philemon), the chapter number is used to disambiguate: only
 * books that actually contain that chapter are considered, so "Phil 2" resolves
 * to Philippians because Philemon has a single chapter.
 *
 * Returns `null` when the book can't be matched or the format is invalid.
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

  // A book name and chapter are always required.
  if (!bookName || !chapterStr) {
    return null;
  }

  const chapter = Number(chapterStr);
  const book = findBook(bookName, books, chapter);
  if (!book) {
    return null;
  }

  const ref: VerseRef = {
    bookId: book.id,
    chapter,
  };

  if (verseStr) {
    // Verse-based reference: "John 3:16", "John 3:16-18", "Genesis 1:1-2:3".
    ref.verse = Number(verseStr);
    if (endVerseStr) {
      ref.endVerse = Number(endVerseStr);
    }
    if (endChapterStr) {
      ref.endChapter = Number(endChapterStr);
    }
  } else if (endVerseStr) {
    // Whole-chapter range: "John 1-3". Without a start verse the trailing number
    // is an end chapter, not an end verse. A colon there (e.g. "John 1-2:3")
    // would mix a chapter start with a verse end, so reject that ambiguity.
    if (endChapterStr) {
      return null;
    }
    ref.endChapter = Number(endVerseStr);
  }

  return ref;
}
