import { scanVerseReferencesInText } from "../BibleDataManager";
import type { TranslationBook } from "../FreeUseBibleAPI";
import type { ContentItem, ContentReference } from "./schema";

/**
 * Step 1 of suggesting passages (design doc §5.3): the ones a text names
 * outright. Unlike the rest of the classifying code, this is bundled by the
 * import worker too, which runs it over the full text of imported web pages.
 */

/** Most passages kept from a page's body text, which can mention dozens in passing. */
export const MAX_BODY_PASSAGES = 10;

export function referenceKey(reference: ContentReference): string {
  return [
    reference.book,
    reference.chapter,
    reference.endChapter ?? "",
    reference.verse ?? "",
    reference.endVerse ?? "",
  ].join("|");
}

/**
 * Every distinct passage `text` names, in the order they first appear, or
 * with `mostNamedFirst`, by how often they're named (ties in order of
 * appearance). At most `limit`.
 */
export function findReferencesInText(
  text: string,
  options: {
    books?: TranslationBook[];
    limit?: number;
    mostNamedFirst?: boolean;
  } = {}
): ContentReference[] {
  const found = new Map<
    string,
    { reference: ContentReference; count: number }
  >();
  for (const match of scanVerseReferencesInText(text, options.books)) {
    const reference: ContentReference = {
      book: match.ref.book,
      chapter: match.ref.chapter,
      ...(match.ref.endChapter !== undefined
        ? { endChapter: match.ref.endChapter }
        : {}),
      ...(match.ref.verse !== undefined ? { verse: match.ref.verse } : {}),
      ...(match.ref.endVerse !== undefined
        ? { endVerse: match.ref.endVerse }
        : {}),
      source: "explicit",
      confidence: 1,
    };
    const key = referenceKey(reference);
    const seen = found.get(key);
    if (seen) {
      seen.count++;
    } else {
      found.set(key, { reference, count: 1 });
    }
  }
  const entries = [...found.values()];
  if (options.mostNamedFirst) {
    // Array sort is stable, so equal counts keep their first-seen order.
    entries.sort((a, b) => b.count - a.count);
  }
  return entries
    .slice(0, options.limit ?? Infinity)
    .map((entry) => entry.reference);
}

/** The passages an item's title and description name outright. */
export function findExplicitReferences(
  item: Pick<ContentItem, "title" | "description">,
  books?: TranslationBook[]
): ContentReference[] {
  return findReferencesInText(`${item.title}\n${item.description}`, { books });
}

/**
 * The passages a whole web page names: everything its title and
 * description name, then the ones its body names most often, up to
 * {@link MAX_BODY_PASSAGES} in all.
 */
export function findPageReferences(
  page: { title: string; description: string; text: string },
  books?: TranslationBook[]
): ContentReference[] {
  const headline = findExplicitReferences(page, books);
  const taken = new Set(headline.map(referenceKey));
  const body = findReferencesInText(page.text, {
    books,
    mostNamedFirst: true,
  }).filter((reference) => !taken.has(referenceKey(reference)));
  return [...headline, ...body].slice(
    0,
    Math.max(MAX_BODY_PASSAGES, headline.length)
  );
}
