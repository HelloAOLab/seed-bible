import { range } from "es-toolkit";
import type { VerseRef } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { bookHasChapter, buildTail } from "../../managers/parseVerseReference";

/** One selectable chapter/verse within a book suggestion. */
export interface ChapterOption {
  ref: VerseRef;
  label: string;
}

/** A matched book plus the chapters offered for it. */
export interface BookSuggestion {
  book: TranslationBook;
  options: ChapterOption[];
}

/** Normalizes a book query for prefix comparison: lowercased, spaces collapsed. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Human-readable label for a reference's chapter/verse portion, e.g. "2",
 * "3:16", "1:2" (single-chapter verse shorthand), or "1-3" (chapter range).
 */
export function formatRefLabel(ref: VerseRef): string {
  let label = String(ref.chapter);
  if (ref.verse != null) {
    label += `:${ref.verse}`;
    if (ref.endChapter != null && ref.endVerse != null) {
      label += `-${ref.endChapter}:${ref.endVerse}`;
    } else if (ref.endVerse != null) {
      label += `-${ref.endVerse}`;
    }
  } else if (ref.endChapter != null) {
    label += `-${ref.endChapter}`;
  }
  return label;
}

/** Books whose common name, name, or id starts with the query. */
function matchBooksByPrefix(
  query: string,
  books: TranslationBook[]
): TranslationBook[] {
  const target = normalize(query);
  if (!target) {
    return [];
  }
  return books.filter(
    (b) =>
      normalize(b.commonName).startsWith(target) ||
      normalize(b.name).startsWith(target) ||
      normalize(b.id).startsWith(target)
  );
}

function suggestion(book: TranslationBook, ref: VerseRef): BookSuggestion {
  return { book, options: [{ ref, label: formatRefLabel(ref) }] };
}

/**
 * Builds the dropdown suggestions for the current input.
 *
 * Books are matched purely by name/id prefix — unlike the reference parser this
 * deliberately does NOT prefer an exact match, so a query is never collapsed to
 * a single book. Typing "Jud 1" lists both Judges 1 and Jude 1 rather than only
 * Jude (whose id happens to be "JUD").
 *
 * - No chapter typed yet: every chapter of each matched book is offered.
 * - A chapter typed with several matching books: only the books that actually
 *   contain that chapter are shown (so "Phil 2" -> Philippians only).
 * - A chapter typed with a single matching book: verses/ranges carry through,
 *   and a lone number against a single-chapter book is read as a verse
 *   ("Philemon 2" -> Philemon 1:2). Verse shorthand is only used for this
 *   unambiguous case — never to break a tie between multiple books.
 */
export function computeSuggestions(
  input: string,
  books: TranslationBook[]
): BookSuggestion[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  // Leading book portion plus an optional chapter/verse/range. The chapter is
  // optional (a bare "Phil" still matches), and book names may start with a
  // digit ("1 John"), so the book runs non-greedily up to a space-separated
  // number.
  const match = trimmed.match(
    /^(.+?)(?:\s+(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+):)?(\d+))?)?$/
  );
  if (!match || !match[1]) {
    return [];
  }
  const [, bookQuery, chapterStr, verseStr, endChapterStr, endVerseStr] = match;

  const matched = matchBooksByPrefix(bookQuery, books);
  if (matched.length === 0) {
    return [];
  }

  // No chapter typed: offer every chapter of each matched book.
  if (!chapterStr) {
    return matched.map((book) => ({
      book,
      options: range(
        book.firstChapterNumber,
        book.firstChapterNumber + book.numberOfChapters
      ).map((chapter) => ({
        ref: { bookId: book.id, chapter },
        label: String(chapter),
      })),
    }));
  }

  const tail = buildTail(verseStr, endChapterStr, endVerseStr);
  if (tail === null) {
    // Invalid format, e.g. "John 1-2:3" (whole-chapter start with a verse end).
    return [];
  }
  const chapter = Number(chapterStr);
  const isBareNumber = !verseStr && !endChapterStr && !endVerseStr;

  if (matched.length === 1) {
    const book = matched[0]!;
    if (isBareNumber && book.numberOfChapters === 1) {
      return [
        suggestion(book, {
          bookId: book.id,
          chapter: book.firstChapterNumber,
          verse: chapter,
        }),
      ];
    }
    return [suggestion(book, { bookId: book.id, chapter, ...tail })];
  }

  // Several books match: show the ones that actually contain the chapter, as
  // whole chapters (with any verse/range). No single-chapter verse shorthand.
  return matched
    .filter((book) => bookHasChapter(book, chapter))
    .map((book) => suggestion(book, { bookId: book.id, chapter, ...tail }));
}
