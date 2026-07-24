/**
 * Pure, IO-free helpers for building the Seed Bible sitemap.
 *
 * The generator (`script/generate-sitemap.ts`) does the network fetching and
 * file writing; everything here is deterministic and unit-tested so the tricky
 * bits — inverting the UI↔Bible language mapping, escaping URLs into XML, and
 * splitting URL sets across the 50,000-per-file sitemap limit — can be verified
 * without hitting the network.
 */
import { UI_TO_BIBLE_LANGUAGE_CODES } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";

/**
 * The largest number of `<url>` (or `<sitemap>`) entries a single sitemap file
 * may contain, per the sitemaps.org protocol. A single Bible translation has at
 * most ~1,189 chapters, well under this, but the guard keeps every emitted file
 * (including the index) spec-compliant regardless of catalog size.
 */
export const MAX_URLS_PER_SITEMAP = 50000;

/**
 * Builds the inverse of `UI_TO_BIBLE_LANGUAGE_CODES`: a map from a Bible-API
 * language code (ISO 639-3, e.g. "spa") to the single UI locale that should
 * wrap it (e.g. "es").
 *
 * Some UI locales share a Bible language (e.g. `he`/`iw` both map to `heb`,
 * `fil`/`tl` to `tgl`, `no`/`nb` to `nob`/`nor`). Ties are broken by insertion
 * order in `UI_TO_BIBLE_LANGUAGE_CODES`: the first locale listed for a code
 * wins, which is the canonical two-letter code (`he` over `iw`, `fil` over
 * `tl`, `no` over `nb`).
 */
export function buildBibleLanguageToUiLocale(): Map<string, string> {
  const map = new Map<string, string>();

  for (const [ui, codes] of Object.entries(UI_TO_BIBLE_LANGUAGE_CODES)) {
    for (const code of codes) {
      const key = code.toLowerCase();
      if (!map.has(key)) {
        map.set(key, ui);
      }
    }
  }

  return map;
}

const BIBLE_LANGUAGE_TO_UI_LOCALE = buildBibleLanguageToUiLocale();

/**
 * Resolves the UI locale that maps to a translation's Bible language, or `null`
 * when no supported UI locale covers that language.
 */
export function bibleLanguageToUiLocale(
  bibleLanguage: string | null | undefined
): string | null {
  if (!bibleLanguage) {
    return null;
  }
  return BIBLE_LANGUAGE_TO_UI_LOCALE.get(bibleLanguage.toLowerCase()) ?? null;
}

export interface ChapterUrlParams {
  /** Translation ID as it appears in the `translation` query param. */
  translationId: string;
  /** USFM book ID, e.g. "GEN". */
  bookId: string;
  /** 1-based chapter number. */
  chapter: number;
  /** UI locale for the `lang` query param; omitted when null/undefined. */
  uiLocale?: string | null;
}

/**
 * Produces the value for the `translation` query param, mirroring the app's
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
 * shape):
 *   `<origin>/?translation=<id>&book=<BOOK>&chapter=<n>[&lang=<locale>]`
 */
export function buildChapterUrl(
  origin: string,
  params: ChapterUrlParams
): string {
  const url = new URL("/", ensureTrailingSlash(origin));
  url.searchParams.set("translation", params.translationId);
  url.searchParams.set("book", params.bookId);
  url.searchParams.set("chapter", String(params.chapter));
  if (params.uiLocale) {
    url.searchParams.set("lang", params.uiLocale);
  }
  return url.toString();
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
