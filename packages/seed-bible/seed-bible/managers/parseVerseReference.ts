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

/** Exact (case-insensitive) match on the book's common name, name, or id. */
function exactBook(
  target: string,
  books: TranslationBook[]
): TranslationBook | null {
  return (
    books.find(
      (b) =>
        normalize(b.commonName) === target ||
        normalize(b.name) === target ||
        normalize(b.id) === target
    ) ?? null
  );
}

/** All books whose common name or name starts with the target. */
function prefixBooks(
  target: string,
  books: TranslationBook[]
): TranslationBook[] {
  return books.filter(
    (b) =>
      normalize(b.commonName).startsWith(target) ||
      normalize(b.name).startsWith(target)
  );
}

/**
 * The trailing verse/range portion of a reference, shared by every candidate
 * book. `verse`/`endVerse`/`endChapter` mirror the fields on {@link VerseRef}.
 */
type ReferenceTail = Pick<VerseRef, "verse" | "endVerse" | "endChapter">;

/**
 * Builds the verse/range portion of a reference from the parsed number groups,
 * or returns `null` when the format is invalid (a whole-chapter start mixed
 * with a verse end, e.g. "John 1-2:3").
 */
function buildTail(
  verseStr: string | undefined,
  endChapterStr: string | undefined,
  endVerseStr: string | undefined
): ReferenceTail | null {
  const tail: ReferenceTail = {};
  if (verseStr) {
    // Verse-based reference: "John 3:16", "John 3:16-18", "Genesis 1:1-2:3".
    tail.verse = Number(verseStr);
    if (endVerseStr) {
      tail.endVerse = Number(endVerseStr);
    }
    if (endChapterStr) {
      tail.endChapter = Number(endChapterStr);
    }
  } else if (endVerseStr) {
    // Whole-chapter range: "John 1-3". Without a start verse the trailing number
    // is an end chapter, not an end verse. A colon there (e.g. "John 1-2:3")
    // would mix a chapter start with a verse end, so reject that ambiguity.
    if (endChapterStr) {
      return null;
    }
    tail.endChapter = Number(endVerseStr);
  }
  return tail;
}

/**
 * Parses a human-typed scripture reference (e.g. "John 3:16", "1 John 2:1-3",
 * "Genesis 1:1-2:3") into every {@link VerseRef} it could plausibly mean,
 * matching the book name against the provided translation books.
 *
 * The verse may be omitted to reference a whole chapter, so a bare "Genesis 1"
 * yields `{ bookId, chapter }`, and a chapter range like "John 1-3" yields
 * `{ bookId, chapter: 1, endChapter: 3 }`. Mixing a chapter start with a verse
 * end (e.g. "John 1-2:3") is invalid and yields an empty list.
 *
 * Book matching is, in order: an exact (case-insensitive) match on the book's
 * common name, name, or id; otherwise a prefix match on the common name or
 * name. An exact match resolves to a single book. When a prefix matches several
 * books (e.g. "Phil" -> Philippians and Philemon), each book that actually
 * contains the requested chapter becomes a separate result — so "Phil 2" yields
 * only Philippians (Philemon has one chapter) while "Phil 1" yields both.
 *
 * For a book that has only one chapter and is named unambiguously, a bare
 * trailing number is read as a verse rather than a chapter, so "Philemon 2"
 * yields `{ bookId, chapter: 1, verse: 2 }` and "Jude 3" yields Jude 1:3.
 *
 * Returns an empty list when the book can't be matched or the format is
 * invalid.
 */
export function parseVerseReferences(
  input: string,
  books: TranslationBook[]
): VerseRef[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  // Split into the leading book-name portion and the trailing numeric portion.
  // The book name runs up to the first chapter number (the first digit that is
  // followed by more numeric/reference characters to the end of the string).
  const match = trimmed.match(
    /^(.+?)\s+(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+):)?(\d+))?$/
  );
  if (!match) {
    return [];
  }

  const [, bookName, chapterStr, verseStr, endChapterStr, endVerseStr] = match;

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

  const target = normalize(bookName);
  const exact = exactBook(target, books);
  // An exact match resolves to a single book; otherwise every prefix match is a
  // candidate to be narrowed by chapter below.
  const nameMatches = exact ? [exact] : prefixBooks(target, books);

  if (nameMatches.length === 0) {
    return [];
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
 * Thin wrapper over {@link parseVerseReferences}: returns the match when it is
 * unambiguous (exactly one), and `null` when the reference can't be matched or
 * is ambiguous (matches more than one book, e.g. "Phil 1" -> Philippians and
 * Philemon). See {@link parseVerseReferences} for the matching rules.
 */
export function parseVerseReference(
  input: string,
  books: TranslationBook[]
): VerseRef | null {
  const refs = parseVerseReferences(input, books);
  return refs.length === 1 ? refs[0]! : null;
}
