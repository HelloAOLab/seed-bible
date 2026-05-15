import * as Typesense from "typesense";
import { z } from "zod";

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
