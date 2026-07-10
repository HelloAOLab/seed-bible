import * as Typesense from "typesense";
import * as z from "zod/v4";
import type { TranslationBook } from "./FreeUseBibleAPI";

const TYPESENSE_NODE_URL = new URL("https://search.ao.bot");
const TYPESENSE_API_KEY = "5A496vKeCWhVxntITkcrZ6i7Fehh9lCB";
const VERSE_COLLECTION_PREFIX = "bibleVerses";

export type SearchType = "verses";

type SearchFilterPrimitive = string | number | boolean;

export type SearchFilters =
  | string
  | Record<
      string,
      SearchFilterPrimitive | SearchFilterPrimitive[] | null | undefined
    >;

export const VerseSearchDocumentSchema = z.object({
  id: z.string(),
  translation: z.string(),
  book: z.string(),
  chapter: z.number(),
  verse: z.number(),
  text: z.string(),
  language: z.string(),
  reference: z.string(),
});

export type VerseSearchDocument = z.infer<typeof VerseSearchDocumentSchema>;

export type VerseSearchResponse = Typesense.SearchResponse<VerseSearchDocument>;

/**
 * A book (optionally with a specific chapter) that matches a search query.
 * Produced locally from the already-loaded book list — no network request.
 */
export interface BookReferenceMatch {
  /** The ID of the matched book. */
  bookId: string;
  /** The display name of the book (the translation's common name). */
  bookName: string;
  /**
   * The chapter the query resolved to, or `null` when no valid chapter number
   * was typed. `null` means "open the book at its first chapter".
   */
  chapterNumber: number | null;
  /** The book's canonical order, used for stable ranking tie-breaks. */
  order: number;
}

/**
 * Ranks book matches so the intended book surfaces first: an exact book-id
 * match beats a name that starts with the query, which beats one that merely
 * contains it. Lower is better; ties fall back to the book's canonical order.
 */
function bookMatchRank(book: TranslationBook, loweredText: string): number {
  if (book.id.toLowerCase() === loweredText) {
    return 0;
  }

  const startsWith =
    book.commonName.toLowerCase().startsWith(loweredText) ||
    book.name.toLowerCase().startsWith(loweredText) ||
    book.id.toLowerCase().startsWith(loweredText);
  if (startsWith) {
    return 1;
  }

  return 2;
}

/**
 * Finds the books (and optional chapter) that match a free-text search query.
 *
 * The query is split into a text part and an optional trailing chapter number,
 * mirroring the Bible selector's convention (`BibleSelectorManager`). For
 * example `"Gen 2"` matches Genesis and resolves chapter 2, `"psa 51"` matches
 * Psalms chapter 51, and `"PSA 5"` resolves via the book id. A bare number or
 * empty text returns nothing (we don't list every book for `"5"`).
 *
 * @param query The raw search query.
 * @param books The books of the active translation.
 * @param limit The maximum number of matches to return.
 */
export function matchBookReferences(
  query: string,
  books: TranslationBook[],
  limit = 6
): BookReferenceMatch[] {
  const chapterStr = query.match(/(\d+)\s*$/)?.[1];
  const loweredText = query
    .replace(/\d+\s*$/, "")
    .trim()
    .toLowerCase();

  if (!loweredText) {
    return [];
  }

  const matched = books
    .filter(
      (book) =>
        book.id.toLowerCase().includes(loweredText) ||
        book.commonName.toLowerCase().includes(loweredText) ||
        book.name.toLowerCase().includes(loweredText) ||
        (book.title?.toLowerCase().includes(loweredText) ?? false)
    )
    .map((book) => ({ book, rank: bookMatchRank(book, loweredText) }))
    .sort((a, b) => a.rank - b.rank || a.book.order - b.book.order)
    .slice(0, limit);

  return matched.map(({ book }) => {
    let chapterNumber: number | null = null;
    if (chapterStr !== undefined) {
      const parsed = Number.parseInt(chapterStr, 10);
      if (
        parsed >= book.firstChapterNumber &&
        parsed <= book.lastChapterNumber
      ) {
        chapterNumber = parsed;
      }
    }

    return {
      bookId: book.id,
      bookName: book.commonName,
      chapterNumber,
      order: book.order,
    };
  });
}

export interface SearchManager {
  /**
   * Searches for verses matching the given text and filters.
   * @param language The ISO 639-3 language code of the verses to search within.
   * @param translationId The ID of the translation to search within.
   * @param query The search query text.
   * @param filters The filters to apply to the search.
   */
  searchVerses: (
    language: string,
    translationId: string,
    query: string,
    filters?: SearchFilters
  ) => Promise<VerseSearchResponse>;
}

function formatFilterValue(value: SearchFilterPrimitive): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildFilterBy(filters?: SearchFilters): string | undefined {
  if (typeof filters === "string") {
    const trimmed = filters.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (!filters) {
    return undefined;
  }

  const clauses = Object.entries(filters)
    .flatMap(([field, rawValue]) => {
      if (rawValue == null) {
        return [];
      }

      if (Array.isArray(rawValue)) {
        if (rawValue.length === 0) {
          return [];
        }

        return `${field}:=[${rawValue.map(formatFilterValue).join(", ")}]`;
      }

      return `${field}:=${formatFilterValue(rawValue)}`;
    })
    .filter((clause) => clause.length > 0);

  return clauses.length > 0 ? clauses.join(" && ") : undefined;
}

function buildVerseFilterBy(
  translationId: string,
  filters?: SearchFilters
): string {
  const translationFilter = `translation:=${formatFilterValue(translationId)}`;
  const additionalFilter = buildFilterBy(filters);

  if (!additionalFilter) {
    return translationFilter;
  }

  return `${translationFilter} && ${additionalFilter}`;
}

export function createSearchManager(): SearchManager {
  if (import.meta.env.SSR) {
    return {
      searchVerses: async () => ({
        found: 0,
        out_of: 0,
        page: 0,
        hits: [],
        request_params: {},
        search_time_ms: 0,
      }),
    };
  }

  const client = new Typesense.Client({
    apiKey: TYPESENSE_API_KEY,
    nodes: [
      {
        host: TYPESENSE_NODE_URL.hostname,
        port: Number(TYPESENSE_NODE_URL.port || 443),
        protocol: TYPESENSE_NODE_URL.protocol.replace(":", ""),
      },
    ],
  });

  const searchVerses = async (
    language: string,
    translationId: string,
    text: string,
    filters?: SearchFilters
  ): Promise<VerseSearchResponse> => {
    const filterBy = buildVerseFilterBy(translationId, filters);

    const collection = `${VERSE_COLLECTION_PREFIX}.${language}`;
    return await client
      .collections<VerseSearchDocument>(collection)
      .documents()
      .search({
        q: text,
        query_by: ["referenceNormalized", "reference", "text"],
        filter_by: filterBy,
      });
  };

  return {
    searchVerses,
  };
}
