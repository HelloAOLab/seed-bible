import { PLAYLIST_PATH_SEGMENT, splitPathSegments } from "./ReadingUrlPath";

export interface ParsedPlaylistPagePath {
  language: string;
  /** The playlist's `{recordName}.{id}` locator. */
  locator: string;
  /** The SEO title slug, or null when the path omitted it. */
  slug: string | null;
  /**
   * The 1-based step being played, or null for the playlist's own page (its
   * intro modal).
   */
  step: number | null;
}

/**
 * Stands in for the title slug in a step path whose playlist has no title,
 * or whose title isn't known (an old `?playlist=` link being redirected).
 * A step path needs some slug: `/{lang}/playlist/{locator}/{x}` is always
 * read as a slug, so a title like "2024" can't be mistaken for step 2024.
 */
export const PLAYLIST_SLUG_PLACEHOLDER = "-";

/**
 * Parses `/{lang}/playlist/{locator}[/{slug}[/{step}]]`. The slug only exists
 * for search engines and link previews, so it is never used to find the
 * playlist and a stale one (the playlist was renamed) still opens it. A
 * trailing step (1-based) means the playlist is playing at that step.
 */
export function parsePlaylistPagePath(
  pathname: string,
  basePath: string
): ParsedPlaylistPagePath | null {
  const segments = splitPathSegments(pathname, basePath);
  if (segments.length < 3 || segments.length > 5) {
    return null;
  }
  const [language, pageSeg, locator, slug, stepSeg] = segments as [
    string,
    string,
    string,
    string | undefined,
    string | undefined,
  ];
  if (pageSeg.toLowerCase() !== PLAYLIST_PATH_SEGMENT || !locator) {
    return null;
  }
  let step: number | null = null;
  if (stepSeg !== undefined) {
    if (!/^[1-9]\d*$/.test(stepSeg)) {
      return null;
    }
    step = Number(stepSeg);
  }
  return { language, locator, slug: slug ?? null, step };
}

/** Longest slug kept; titles past this are cut at a word boundary. */
const MAX_SLUG_LENGTH = 80;

/**
 * Turns a playlist title into a URL slug: lowercase, with every run of
 * characters that aren't letters or digits (in any script) collapsed to a
 * single hyphen. Returns "" when nothing usable is left, so the caller can
 * drop the segment.
 */
export function slugifyPlaylistTitle(title: string | null | undefined): string {
  if (!title) {
    return "";
  }
  const slug = title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }
  const cut = slug.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, "");
}

/**
 * Builds `/{lang}/playlist/{locator}[/{slug}]`, or with `step` (1-based) the
 * playing path `/{lang}/playlist/{locator}/{slug}/{step}`.
 */
export function buildPlaylistPagePath(params: {
  language: string;
  locator: string;
  title: string | null | undefined;
  step?: number | null;
}): string {
  const { language, locator, title, step } = params;
  const slug = slugifyPlaylistTitle(title);
  const path = `/${encodeURIComponent(language)}/${PLAYLIST_PATH_SEGMENT}/${encodeURIComponent(locator)}`;
  if (step != null) {
    return `${path}/${encodeURIComponent(slug || PLAYLIST_SLUG_PLACEHOLDER)}/${step}`;
  }
  return slug ? `${path}/${encodeURIComponent(slug)}` : path;
}
