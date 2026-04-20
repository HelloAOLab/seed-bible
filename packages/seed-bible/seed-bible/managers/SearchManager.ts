import Typesense from "typesense";

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

export interface VerseSearchHit {
  document: Record<string, unknown>;
  highlight?: Record<string, unknown>;
  text_match?: number;
  text_match_info?: unknown;
}

export interface VerseSearchResponse {
  found: number;
  out_of: number;
  page: number;
  hits?: VerseSearchHit[];
  request_params?: Record<string, unknown>;
  search_cutoff?: boolean;
  search_time_ms?: number;
  [key: string]: unknown;
}

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

        return (await client
          .collections(VERSE_COLLECTION)
          .documents()
          .search({
            q: text,
            query_by: "text",
            ...(filterBy ? { filter_by: filterBy } : {}),
          })) as VerseSearchResponse;
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
