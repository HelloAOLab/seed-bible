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
    description: optionalString,
    excerpt: optionalString,
    snippet: optionalString,
    summary: optionalString,
    url: optionalString,
    link: optionalString,
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
    const title = item.title ?? item.name;
    const url = item.url ?? item.link;
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
    });
  }
  return results;
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
