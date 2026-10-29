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
