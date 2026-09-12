/** Dev override: `localStorage.setItem("bible-atlas-origin", "http://localhost:5173")`. */
export const BIBLE_ATLAS_ORIGIN =
  (typeof localStorage !== "undefined" &&
    localStorage.getItem("bible-atlas-origin")) ||
  "https://bible-atlas.com";

export interface AtlasEntity {
  id: string;
  type: string;
  name: string;
  embed: { path: string; title: string };
}

interface VerseContextResponse {
  success: boolean;
  data?: {
    entities: Array<{
      id: string;
      type: string;
      name: string;
      embed: { path: string; title: string } | null;
    }>;
    visualizations: Array<{
      id: string;
      type: string;
      label: string;
      embed: { path: string; title: string };
    }>;
  };
}

// Cached by promise so overlapping requests for the same selection share one fetch.
const cache = new Map<string, Promise<AtlasEntity[]>>();

let catalogCache: Promise<AtlasVisualization[]> | null = null;

/** Resets the fetch caches below; test-only. */
export function clearEntityCache() {
  cache.clear();
  catalogCache = null;
}

/**
 * Fetches the entities and visualization CTAs Bible Atlas links to a
 * selection of verses within one chapter. The server dedupes and orders the
 * result, and caps the selection at its first 20 verses.
 */
async function fetchVerseContext(
  book: string,
  chapter: number,
  verses: number[]
): Promise<AtlasEntity[]> {
  const url = new URL("/api/v1/verse-context", BIBLE_ATLAS_ORIGIN);
  url.searchParams.set("usfm", book);
  url.searchParams.set("chapter", String(chapter));
  url.searchParams.set("verses", verses.join(","));

  const response = await fetch(url);
  const body = (await response.json()) as VerseContextResponse;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(
      `Bible Atlas returned ${response.status} for ${book} ${chapter}:${verses.join(",")}`
    );
  }

  const entities = body.data.entities.flatMap((e) =>
    e.embed ? [{ id: e.id, type: e.type, name: e.name, embed: e.embed }] : []
  );
  const visualizations = body.data.visualizations.map((v) => ({
    id: v.id,
    type: "visualization",
    name: v.label,
    embed: v.embed,
  }));
  return [...entities, ...visualizations];
}

/**
 * Fetches the entities and visualizations Bible Atlas links to a verse
 * selection. A failed request returns an empty list rather than throwing.
 */
export async function fetchEntities(
  book: string,
  chapter: number,
  verses: number[]
): Promise<AtlasEntity[]> {
  const key = `${book}.${chapter}.${verses.join(",")}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetchVerseContext(book, chapter, verses);
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
  }
  try {
    return await pending;
  } catch (err) {
    console.warn(
      `Bible Atlas lookup failed for ${book} ${chapter}:${verses.join(",")}`,
      err
    );
    return [];
  }
}

export interface AtlasVisualization {
  id: string;
  title: string;
  embed: { path: string; title: string };
}

interface VisualizationCatalogResponse {
  success: boolean;
  data?: {
    items: Array<{
      slug: string;
      title: string;
      embeds?: Array<{ path: string; title: string }>;
    }>;
  };
}

async function fetchVisualizationCatalogFromApi(): Promise<
  AtlasVisualization[]
> {
  const url = new URL("/api/v1/visualizations", BIBLE_ATLAS_ORIGIN);
  const response = await fetch(url);
  const body = (await response.json()) as VisualizationCatalogResponse;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(
      `Bible Atlas returned ${response.status} for visualizations`
    );
  }

  return body.data.items.flatMap((item) => {
    const embeds = item.embeds ?? [];
    return embeds.map((embed, i) => ({
      id: `${item.slug}:${i}`,
      title: embed.title,
      embed,
    }));
  });
}

/**
 * Fetches the visualization catalog once and caches it for reuse. A failed
 * request returns an empty list rather than throwing.
 */
export async function fetchVisualizationCatalog(): Promise<
  AtlasVisualization[]
> {
  if (!catalogCache) {
    catalogCache = fetchVisualizationCatalogFromApi();
    catalogCache.catch(() => {
      catalogCache = null;
    });
  }
  try {
    return await catalogCache;
  } catch (err) {
    console.warn("Bible Atlas visualization catalog request failed", err);
    return [];
  }
}
