import { splitPathSegments } from "./ReadingUrlPath";

/**
 * URL slugs for pages that aren't a reading position. Kept as its own tiny
 * parser rather than folded into `parseReadingPath` — static pages have no
 * book/chapter/translation and none of the legacy-redirect concerns a reading
 * path carries.
 */
export type StaticPageId = "about";

const STATIC_PAGE_IDS: readonly StaticPageId[] = ["about"];

export interface ParsedStaticPagePath {
  language: string;
  page: StaticPageId;
}

/**
 * Parses the exact `/{lang}/{page}` (2-segment) shape used by static pages.
 * Returns null for anything else, including a 2-segment path whose second
 * segment isn't a known static page — that shape belongs to the *reading*
 * URL scheme's legacy `/{book}/{chapter}` form (or garbage), not this
 * module's job.
 */
export function parseStaticPagePath(
  pathname: string,
  basePath: string
): ParsedStaticPagePath | null {
  const segments = splitPathSegments(pathname, basePath);
  if (segments.length !== 2) {
    return null;
  }
  const [language, pageSeg] = segments as [string, string];
  const page = STATIC_PAGE_IDS.find((id) => id === pageSeg.toLowerCase());
  return page ? { language, page } : null;
}

/** Builds the canonical `/{lang}/{page}` path for a static page. */
export function buildStaticPagePath(params: {
  language: string;
  page: StaticPageId;
}): string {
  return `/${encodeURIComponent(params.language)}/${params.page}`;
}
