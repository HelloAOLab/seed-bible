import { range } from "es-toolkit";
import type { VerseRef } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { parseVerseReferences } from "../../managers/parseVerseReference";

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

/**
 * Splits typed input into the leading book-name portion and whether a trailing
 * chapter number was typed. Unlike the reference parser the chapter is optional,
 * so a bare "Phil" still yields a book query. Book names may start with a digit
 * ("1 John"), so the book runs non-greedily up to a space-separated number.
 */
export function splitBookAndChapter(input: string): {
  bookQuery: string;
  hasChapter: boolean;
} {
  const match = input.match(
    /^(.+?)(?:\s+(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+):)?(\d+))?)?$/
  );
  if (!match || !match[1]) {
    return { bookQuery: input, hasChapter: false };
  }
  return { bookQuery: match[1], hasChapter: match[2] != null };
}

/**
 * Builds the dropdown suggestions for the current input.
 *
 * When a chapter number has been typed the reference parser does the work —
 * it resolves ambiguous prefixes, narrows to books that actually contain the
 * chapter, and handles verses, ranges, and single-chapter shorthand — and the
 * results are grouped by book. When no chapter is typed yet, books are matched
 * by name/id prefix and every chapter is offered so the user can pick one.
 */
export function computeSuggestions(
  input: string,
  books: TranslationBook[]
): BookSuggestion[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  const { bookQuery, hasChapter } = splitBookAndChapter(trimmed);

  if (hasChapter) {
    const byBook = new Map<string, BookSuggestion>();
    for (const ref of parseVerseReferences(trimmed, books)) {
      const book = books.find((b) => b.id === ref.bookId);
      if (!book) {
        continue;
      }
      let suggestion = byBook.get(book.id);
      if (!suggestion) {
        suggestion = { book, options: [] };
        byBook.set(book.id, suggestion);
      }
      suggestion.options.push({ ref, label: formatRefLabel(ref) });
    }
    return [...byBook.values()];
  }

  const target = normalize(bookQuery);
  if (!target) {
    return [];
  }
  return books
    .filter(
      (b) =>
        normalize(b.commonName).startsWith(target) ||
        normalize(b.name).startsWith(target) ||
        normalize(b.id).startsWith(target)
    )
    .map((book) => {
      const first = book.firstChapterNumber;
      return {
        book,
        options: range(first, first + book.numberOfChapters).map((chapter) => ({
          ref: { bookId: book.id, chapter },
          label: String(chapter),
        })),
      };
    });
}
