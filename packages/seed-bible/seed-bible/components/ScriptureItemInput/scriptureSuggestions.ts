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
 * "3:16", "1:2" (single-chapter verse), or "1-3" (chapter range).
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

/** Every chapter number the book contains. */
function chaptersOf(book: TranslationBook): number[] {
  return range(
    book.firstChapterNumber,
    book.firstChapterNumber + book.numberOfChapters
  );
}

function toOption(ref: VerseRef): ChapterOption {
  return { ref, label: formatRefLabel(ref) };
}

/**
 * The chapter/verse options offered for a single matched book once a number has
 * been typed.
 *
 * - Single-chapter books (e.g. Jude): a lone number is a verse — "Jude 2" means
 *   Jude 1:2 — accepted only when it's a real verse (1..totalNumberOfVerses).
 *   An explicit "chapter:verse" instead targets the one chapter.
 * - Multi-chapter books (e.g. Judges): a lone number is a chapter, matched by
 *   prefix so "Jud 2" surfaces 2, 20 and 21. An explicit verse/range pins the
 *   exact chapter.
 */
function optionsForBook(
  book: TranslationBook,
  chapterStr: string,
  typed: number,
  tail: ReturnType<typeof buildTail>,
  isBareNumber: boolean
): ChapterOption[] {
  if (book.numberOfChapters === 1) {
    if (isBareNumber) {
      if (typed >= 1 && typed <= book.totalNumberOfVerses) {
        return [
          toOption({
            bookId: book.id,
            chapter: book.firstChapterNumber,
            verse: typed,
          }),
        ];
      }
      return [];
    }
    return bookHasChapter(book, typed)
      ? [toOption({ bookId: book.id, chapter: typed, ...tail })]
      : [];
  }

  if (isBareNumber) {
    return chaptersOf(book)
      .filter((chapter) => String(chapter).startsWith(chapterStr))
      .map((chapter) => toOption({ bookId: book.id, chapter }));
  }
  return bookHasChapter(book, typed)
    ? [toOption({ bookId: book.id, chapter: typed, ...tail })]
    : [];
}

/**
 * Builds the dropdown suggestions for the current input.
 *
 * Books are matched purely by name/id prefix — unlike the reference parser this
 * deliberately does NOT prefer an exact match, so a query is never collapsed to
 * a single book (typing "Jud" keeps both Judges and Jude). Each matched book
 * then offers chapters or verses per {@link optionsForBook}; books with no
 * matching chapter/verse are dropped.
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

  // No number typed yet: offer every chapter of each matched book.
  if (!chapterStr) {
    return matched.map((book) => ({
      book,
      options: chaptersOf(book).map((chapter) =>
        toOption({ bookId: book.id, chapter })
      ),
    }));
  }

  const tail = buildTail(verseStr, endChapterStr, endVerseStr);
  if (tail === null) {
    // Invalid format, e.g. "John 1-2:3" (whole-chapter start with a verse end).
    return [];
  }
  const typed = Number(chapterStr);
  const isBareNumber = !verseStr && !endChapterStr && !endVerseStr;

  const suggestions: BookSuggestion[] = [];
  for (const book of matched) {
    const options = optionsForBook(book, chapterStr, typed, tail, isBareNumber);
    if (options.length > 0) {
      suggestions.push({ book, options });
    }
  }
  return suggestions;
}
