/**
 * Pure, IO-free helpers for building the Seed Bible sitemap.
 *
 * The generator (`script/generate-sitemap.ts`) does the network fetching and
 * file writing; everything here is deterministic and unit-tested so the tricky
 * bits — inverting the UI↔Bible language mapping, escaping URLs into XML, and
 * splitting URL sets across the 50,000-per-file sitemap limit — can be verified
 * without hitting the network.
 */
import {
  DEFAULT_UI_LANGUAGE,
  buildReadingPath,
} from "@packages/seed-bible/seed-bible/managers/ReadingUrlPath";
import type { BookId } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";

// Re-exported rather than defined here: the app's `canonicalUrl` needs the
// same Bible-language -> UI-locale mapping, and if the two ever drifted the
// sitemap would advertise URLs whose own pages point somewhere else.
export {
  buildBibleLanguageToUiLocale,
  bibleLanguageToUiLocale,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";

/**
 * The largest number of `<url>` (or `<sitemap>`) entries a single sitemap file
 * may contain, per the sitemaps.org protocol. A single Bible translation has at
 * most ~1,189 chapters, well under this, but the guard keeps every emitted file
 * (including the index) spec-compliant regardless of catalog size.
 */
export const MAX_URLS_PER_SITEMAP = 50000;

export interface ChapterUrlParams {
  /** Translation ID as it appears in the `translation` query param. */
  translationId: string;
  /** USFM book ID, e.g. "GEN". */
  bookId: string;
  /** 1-based chapter number. */
  chapter: number;
  /**
   * UI locale for the language path segment. Falls back to
   * `DEFAULT_UI_LANGUAGE` when null/undefined — the segment is always
   * present, so a translation whose language maps to no supported UI locale
   * still gets a URL that doesn't redirect.
   */
  uiLocale?: string | null;
}

/**
 * Produces the translation identifier used in the URL, mirroring the app's
 * `BibleDataManager.buildTranslationId`: the bare translation ID when the
 * catalog endpoint is the app's default endpoint, otherwise the full
 * `…/api/{id}/books.json` URL. Keeping this in lock-step with the app ensures
 * sitemap URLs match the site's own canonical URLs regardless of which endpoint
 * the catalog is fetched from.
 */
export function buildTranslationParam(
  translationId: string,
  endpoint: string,
  defaultEndpoint: string
): string {
  if (ensureTrailingSlash(endpoint) === ensureTrailingSlash(defaultEndpoint)) {
    return translationId;
  }
  return new URL(
    `api/${translationId}/books.json`,
    ensureTrailingSlash(endpoint)
  ).href;
}

/**
 * Builds a canonical reader URL for a chapter. This mirrors the app's own
 * `SeedBibleStateManager.canonicalUrl` (the on-page source of truth for the
 * shape) by going through the same `buildReadingPath`:
 *   `<origin>/<locale>/<translationId>/<book-slug>/<n>`
 *
 * The language segment is always spelled out — a 3-segment URL omitting it is
 * a redirect entry point, not a destination (see `legacyReadingUrlRedirect`
 * in `entry-ssr.tsx`). Listing the short form here would make every sitemap
 * entry a redirect that disagrees with the destination page's own
 * `rel=canonical`.
 */
export function buildChapterUrl(
  origin: string,
  params: ChapterUrlParams
): string {
  const readingPath = buildReadingPath({
    language: params.uiLocale || DEFAULT_UI_LANGUAGE,
    translationId: params.translationId,
    bookId: params.bookId as BookId,
    chapter: params.chapter,
  });
  return new URL(readingPath, ensureTrailingSlash(origin)).toString();
}

export interface BookChapters {
  bookId: string;
  firstChapterNumber: number;
  numberOfChapters: number;
}

/**
 * Expands a translation's book list into one canonical URL per chapter.
 * Books with no chapters are skipped.
 */
export function chapterUrlsForTranslation(
  origin: string,
  translationId: string,
  uiLocale: string | null,
  books: readonly BookChapters[]
): string[] {
  const urls: string[] = [];
  for (const book of books) {
    if (book.numberOfChapters <= 0) {
      continue;
    }
    const first = book.firstChapterNumber;
    for (let i = 0; i < book.numberOfChapters; i++) {
      urls.push(
        buildChapterUrl(origin, {
          translationId,
          bookId: book.bookId,
          chapter: first + i,
          uiLocale,
        })
      );
    }
  }
  return urls;
}

/** Escapes the five XML predefined entities for safe inclusion in element text. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Renders a `<urlset>` document from a list of location URLs. */
export function renderUrlset(urls: readonly string[]): string {
  const body = urls
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  );
}

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

/** Renders a `<sitemapindex>` document pointing at child sitemap files. */
export function renderSitemapIndex(
  entries: readonly SitemapIndexEntry[]
): string {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : "";
      return `  <sitemap><loc>${escapeXml(entry.loc)}</loc>${lastmod}</sitemap>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</sitemapindex>\n`
  );
}

/** Splits a list into chunks of at most `size` items. */
export function chunk<T>(
  items: readonly T[],
  size = MAX_URLS_PER_SITEMAP
): T[][] {
  if (size <= 0) {
    throw new Error("chunk size must be a positive integer");
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Turns a translation ID into a filesystem- and URL-safe base name. Translation
 * IDs are usually simple (`BSB`, `eng_kjv`) but can contain slashes or spaces,
 * so anything outside `[A-Za-z0-9._-]` collapses to `_`.
 */
export function sanitizeSitemapName(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "translation";
}

/**
 * Builds a unique child-sitemap base name for a translation, disambiguating
 * against names already handed out (two different IDs can sanitize to the same
 * string) by appending a numeric suffix.
 */
export function uniqueSitemapName(id: string, used: Set<string>): string {
  const base = sanitizeSitemapName(id);
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  used.add(candidate);
  return candidate;
}

export function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
