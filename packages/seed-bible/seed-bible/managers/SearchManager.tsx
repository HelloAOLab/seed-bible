import Typesense from "typesense-fixed";
import { z } from "zod";

const TYPESENSE_NODE_URL = new URL("https://search.ao.bot");
const TYPESENSE_API_KEY = "2q7kmXHFUNXxutBv1zgXlhWcHyda7f5I";
const VERSE_COLLECTION = "bible-verses";

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
  search: (
    type: SearchType,
    text: string,
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

  const search = async (
    type: SearchType,
    text: string,
    filters?: SearchFilters
  ): Promise<VerseSearchResponse> => {
    switch (type) {
      case "verses": {
        const filterBy = buildFilterBy(filters);

        return await client
          .collections<VerseSearchDocument>(VERSE_COLLECTION)
          .documents()
          .search({
            q: text,
            query_by: ["referenceNormalized", "reference", "text"],
            ...(filterBy ? { filter_by: filterBy } : {}),
          });
      }
      default: {
        throw new Error(`Unsupported search type: ${type satisfies never}`);
      }
    }
  };

  return {
    search,
  };
}
