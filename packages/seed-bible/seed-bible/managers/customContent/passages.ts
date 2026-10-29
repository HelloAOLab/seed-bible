import { formatRefLabel } from "../../components/ScriptureItemInput/scriptureSuggestions";
import { BOOK_SLUGS, type BookId } from "../BibleDataManager";
import type { TranslationBook } from "../FreeUseBibleAPI";
import { parseSingleVerseReference } from "../parseVerseReference";
import { isVerseReferenceInBounds } from "../verseReferenceBounds";
import type { ContentReference } from "./schema";

/**
 * Reads typed passages, separated by `;` or new lines ("John 10:1-18;
 * Psalm 23"). Anything that isn't a real passage is handed back as typed.
 * `books` lets localized book names from the open translation match.
 *
 * Browser-only: the verse parser it uses isn't part of what the import
 * worker bundles.
 */
export function parsePassages(
  text: string,
  books?: TranslationBook[]
): { references: ContentReference[]; unrecognized: string[] } {
  const references: ContentReference[] = [];
  const unrecognized: string[] = [];
  for (const part of text.split(/[;\n]/)) {
    const typed = part.trim();
    if (!typed) {
      continue;
    }
    const parsed = parseSingleVerseReference(typed, books);
    if (
      !parsed ||
      !isVerseReferenceInBounds(
        parsed.bookId,
        parsed.chapter,
        parsed.verse,
        parsed.endChapter,
        parsed.endVerse,
        books
      )
    ) {
      unrecognized.push(typed);
      continue;
    }
    references.push({
      book: parsed.bookId,
      chapter: parsed.chapter,
      ...(parsed.endChapter !== undefined
        ? { endChapter: parsed.endChapter }
        : {}),
      ...(parsed.verse !== undefined ? { verse: parsed.verse } : {}),
      ...(parsed.endVerse !== undefined ? { endVerse: parsed.endVerse } : {}),
      source: "owner",
      confidence: 1,
    });
  }
  return { references, unrecognized };
}

/**
 * The book's name in the open translation, or, with none, an English name
 * built from its URL slug ("1-john" → "1 John").
 */
function bookName(bookId: string, books: TranslationBook[] | undefined) {
  const fromTranslation = books?.find((book) => book.id === bookId)?.commonName;
  if (fromTranslation) {
    return fromTranslation;
  }
  const slug = BOOK_SLUGS[bookId as BookId];
  if (!slug) {
    return bookId;
  }
  return slug
    .split("-")
    .map((word) =>
      word === "of" ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

/** A passage as people write it, e.g. "John 10:1-18" or "1 John 2". */
export function formatContentReference(
  reference: Pick<
    ContentReference,
    "book" | "chapter" | "endChapter" | "verse" | "endVerse"
  >,
  books?: TranslationBook[]
): string {
  return `${bookName(reference.book, books)} ${formatRefLabel({
    bookId: reference.book,
    chapter: reference.chapter,
    endChapter: reference.endChapter,
    verse: reference.verse,
    endVerse: reference.endVerse,
  })}`;
}
