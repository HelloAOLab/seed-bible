import type { TranslationBook } from "./FreeUseBibleAPI";
import type { VerseRef } from "./PlaylistManager";
/** Whether the given chapter number falls within the book's chapter range. */
export declare function bookHasChapter(
  book: TranslationBook,
  chapter: number
): boolean;
/**
 * The trailing verse/range portion of a reference, shared by every candidate
 * book. `verse`/`endVerse`/`endChapter` mirror the fields on {@link VerseRef}.
 */
export type ReferenceTail = Pick<VerseRef, "verse" | "endVerse" | "endChapter">;
/**
 * Builds the verse/range portion of a reference from the parsed number groups,
 * or returns `null` when the format is invalid (a whole-chapter start mixed
 * with a verse end, e.g. "John 1-2:3").
 */
export declare function buildTail(
  verseStr: string | undefined,
  endChapterStr: string | undefined,
  endVerseStr: string | undefined
): ReferenceTail | null;
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
export declare function parseVerseReferences(
  input: string,
  books: TranslationBook[]
): VerseRef[];
/**
 * Parses a human-typed scripture reference into a single {@link VerseRef}.
 *
 * Thin wrapper over {@link parseVerseReferences}: returns the match when it is
 * unambiguous (exactly one), and `null` when the reference can't be matched or
 * is ambiguous (matches more than one book, e.g. "Phil 1" -> Philippians and
 * Philemon). See {@link parseVerseReferences} for the matching rules.
 */
export declare function parseVerseReference(
  input: string,
  books: TranslationBook[]
): VerseRef | null;
