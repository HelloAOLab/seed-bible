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
      type: string;
      label: string;
      embed: { path: string; title: string };
    }>;
  };
}

// Cached by promise so overlapping requests for the same verse share one fetch.
const cache = new Map<string, Promise<AtlasEntity[]>>();

let catalogCache: Promise<AtlasVisualization[]> | null = null;

/** Resets the fetch caches below; test-only. */
export function clearEntityCache() {
  cache.clear();
  catalogCache = null;
}

/** Fetches the entities and visualizations Bible Atlas links to one verse. */
async function fetchVerse(
  book: string,
  chapter: number,
  verse: number
): Promise<AtlasEntity[]> {
  const url = new URL("/api/v1/verse-context", BIBLE_ATLAS_ORIGIN);
  url.searchParams.set("usfm", book);
  url.searchParams.set("chapter", String(chapter));
  url.searchParams.set("verse", String(verse));

  const response = await fetch(url);
  const body = (await response.json()) as VerseContextResponse;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(
      `Bible Atlas returned ${response.status} for ${book} ${chapter}:${verse}`
    );
  }

  const entities = body.data.entities.flatMap((e) =>
    e.embed ? [{ id: e.id, type: e.type, name: e.name, embed: e.embed }] : []
  );
  // Keyed by type + label, not type alone: a verse can link two
  // visualizations of the same type (e.g. Paul's and Peter's journey maps
  // are both "journey").
  const visualizations = body.data.visualizations.map((v) => ({
    id: `viz:${v.type}:${v.label}`,
    type: "visualization",
    name: v.label,
    embed: v.embed,
  }));
  return [...entities, ...visualizations];
}

/**
 * Fetches and merges entities for several verses, deduped by id. A verse
 * whose request fails contributes nothing rather than failing the whole call.
 */
export async function fetchEntities(
  book: string,
  chapter: number,
  verses: number[]
): Promise<AtlasEntity[]> {
  const results = await Promise.allSettled(
    verses.map((verse) => {
      const key = `${book}.${chapter}.${verse}`;
      let pending = cache.get(key);
      if (!pending) {
        pending = fetchVerse(book, chapter, verse);
        cache.set(key, pending);
        pending.catch(() => cache.delete(key));
      }
      return pending;
    })
  );

  const seen = new Set<string>();
  const merged: AtlasEntity[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.warn(
        `Bible Atlas lookup failed for ${book} ${chapter}:${verses[i]}`,
        result.reason
      );
      return;
    }
    for (const entity of result.value) {
      if (!seen.has(entity.id)) {
        seen.add(entity.id);
        merged.push(entity);
      }
    }
  });
  const isViz = (e: AtlasEntity) => e.type === "visualization";
  return [...merged.filter((e) => !isViz(e)), ...merged.filter(isViz)];
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

/** Fetches the full visualization catalog, uncached. */
async function fetchVisualizationCatalogUncached(): Promise<
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
    catalogCache = fetchVisualizationCatalogUncached();
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
