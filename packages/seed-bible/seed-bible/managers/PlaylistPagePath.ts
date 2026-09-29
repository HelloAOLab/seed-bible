import { PLAYLIST_PATH_SEGMENT, splitPathSegments } from "./ReadingUrlPath";

export interface ParsedPlaylistPagePath {
  language: string;
  /** The playlist's `{recordName}.{id}` locator. */
  locator: string;
  /** The SEO title slug, or null when the path omitted it. */
  slug: string | null;
}

/**
 * Parses `/{lang}/playlist/{locator}[/{slug}]`. The slug only exists for
 * search engines and link previews, so it is never used to find the playlist
 * and a stale one (the playlist was renamed) still opens it.
 */
export function parsePlaylistPagePath(
  pathname: string,
  basePath: string
): ParsedPlaylistPagePath | null {
  const segments = splitPathSegments(pathname, basePath);
  if (segments.length !== 3 && segments.length !== 4) {
    return null;
  }
  const [language, pageSeg, locator, slug] = segments as [
    string,
    string,
    string,
    string | undefined,
  ];
  if (pageSeg.toLowerCase() !== PLAYLIST_PATH_SEGMENT || !locator) {
    return null;
  }
  return { language, locator, slug: slug ?? null };
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

/** Builds `/{lang}/playlist/{locator}[/{slug}]`. */
export function buildPlaylistPagePath(params: {
  language: string;
  locator: string;
  title: string | null | undefined;
}): string {
  const { language, locator, title } = params;
  const slug = slugifyPlaylistTitle(title);
  const path = `/${encodeURIComponent(language)}/${PLAYLIST_PATH_SEGMENT}/${encodeURIComponent(locator)}`;
  return slug ? `${path}/${encodeURIComponent(slug)}` : path;
}
