import { z } from "zod";

export const APOLOGIST_SEARCH_TYPES = [
  "article",
  "youtube",
  "episode",
  "media",
  "url",
] as const;

export interface ApologistSearchResult {
  id: string;
  type?: string;
  title: string;
  description: string;
  url: string;
  image?: string;
  author?: string;
  /** The website the result links to, without "www." — e.g. "ligonier.org". */
  source?: string;
}

const optionalString = z.string().nullish();

// The search response's exact field names aren't pinned down, so each field
// accepts the common aliases rather than dropping every result over a rename.
const searchItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).nullish(),
    type: optionalString,
    title: optionalString,
    name: optionalString,
    Name: optionalString,
    description: optionalString,
    excerpt: optionalString,
    snippet: optionalString,
    summary: optionalString,
    url: optionalString,
    link: optionalString,
    referral_url: optionalString,
    listing_url: optionalString,
    image: optionalString,
    image_url: optionalString,
    thumbnail: optionalString,
    thumbnail_url: optionalString,
    author: optionalString,
  })
  .passthrough();

const searchResponseSchema = z.union([
  z.array(searchItemSchema),
  z
    .object({ data: z.array(searchItemSchema) })
    .transform((response) => response.data),
  z
    .object({ results: z.array(searchItemSchema) })
    .transform((response) => response.results),
]);

export function parseSearchResponse(body: unknown): ApologistSearchResult[] {
  const items = searchResponseSchema.parse(body);

  const results: ApologistSearchResult[] = [];
  for (const item of items) {
    const title = item.title ?? item.name ?? item.Name;
    const url =
      item.url || item.referral_url || item.listing_url || item.link || null;
    if (!title || !url) {
      continue;
    }
    results.push({
      id: item.id != null ? String(item.id) : url,
      type: item.type ?? undefined,
      title,
      description:
        item.description ?? item.excerpt ?? item.snippet ?? item.summary ?? "",
      url,
      image:
        item.image ??
        item.image_url ??
        item.thumbnail ??
        item.thumbnail_url ??
        undefined,
      author: item.author ?? undefined,
      source: getSiteName(url),
    });
  }
  return results;
}

function getSiteName(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Every chapter (or chapter range) of `bookName` that `text` mentions, e.g.
 * "John 3:16" → [3, 3] and "John 1–4" → [1, 4]. A numbered book like
 * "1 John" doesn't count as a mention of "John".
 */
function findChapterMentions(
  text: string,
  bookName: string
): [start: number, end: number][] {
  const regex = new RegExp(
    // Lookbehinds rather than `\b`, which doesn't treat accented letters
    // ("Éxodo") as word characters.
    `(?<![\\p{L}\\p{N}])(?<!\\d\\s+)${escapeRegExp(bookName)}\\s+(\\d+)(?:\\s*[–-]\\s*(\\d+))?`,
    "giu"
  );
  const mentions: [number, number][] = [];
  for (const match of text.matchAll(regex)) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    mentions.push([Math.min(start, end), Math.max(start, end)]);
  }
  return mentions;
}

function mentionsChapter(
  mentions: [number, number][],
  chapter: number
): boolean {
  return mentions.some(([start, end]) => chapter >= start && chapter <= end);
}

/**
 * Tidies semantic search results for one chapter. Semantic search is fuzzy,
 * so a search for "John 3" also returns content about John 4: results whose
 * title names a different chapter of the same book are dropped, repeats (by
 * id or title) are removed, and results that mention the chapter itself move
 * to the front. Everything else keeps the API's relevance order.
 */
export function rankResultsForChapter(
  results: readonly ApologistSearchResult[],
  bookName: string,
  chapter: number
): ApologistSearchResult[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const mentioning: ApologistSearchResult[] = [];
  const rest: ApologistSearchResult[] = [];

  for (const result of results) {
    const titleKey = normalizeTitle(result.title);
    if (seenIds.has(result.id) || seenTitles.has(titleKey)) {
      continue;
    }

    const titleMentions = findChapterMentions(result.title, bookName);
    if (titleMentions.length > 0 && !mentionsChapter(titleMentions, chapter)) {
      continue;
    }

    seenIds.add(result.id);
    seenTitles.add(titleKey);

    const textMentions = findChapterMentions(
      `${result.title} ${result.description}`,
      bookName
    );
    (mentionsChapter(textMentions, chapter) ? mentioning : rest).push(result);
  }

  return [...mentioning, ...rest];
}

export async function searchApologistContent(options: {
  domain: string;
  query: string;
  teamId: number;
  apiKey: string | null;
}): Promise<ApologistSearchResult[]> {
  const response = await fetch(`https://${options.domain}/api/v1/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.apiKey ? { "x-api-key": options.apiKey } : {}),
    },
    body: JSON.stringify({
      query: options.query,
      limit: 20,
      filters: {
        team_ids: [options.teamId],
        model: "source",
        types: APOLOGIST_SEARCH_TYPES,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Apologist search request failed (${response.status})${
        body ? `: ${body}` : ""
      }`
    );
  }

  return parseSearchResponse(await response.json());
}
