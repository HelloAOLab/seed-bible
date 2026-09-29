import {
  SHARED_PAGE_PATH_SEGMENTS,
  splitPathSegments,
  type SharedPageKind,
} from "./ReadingUrlPath";

export type { SharedPageKind };

export interface ParsedSharedPagePath {
  kind: SharedPageKind;
  language: string;
  /** The shared record's `{recordName}.{id}` locator. */
  locator: string;
  /** The SEO title slug, or null when the path omitted it. */
  slug: string | null;
}

/**
 * Parses a shared content page, `/{lang}/{segment}/{locator}[/{slug}]`, where
 * `segment` names the kind of content (see `SHARED_PAGE_PATH_SEGMENTS`). The
 * slug only exists for search engines and link previews, so it is never used
 * to find the record and a stale one (the content was renamed) still opens it.
 */
export function parseSharedPagePath(
  pathname: string,
  basePath: string
): ParsedSharedPagePath | null {
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
  const kind = (
    Object.keys(SHARED_PAGE_PATH_SEGMENTS) as SharedPageKind[]
  ).find((k) => SHARED_PAGE_PATH_SEGMENTS[k] === pageSeg.toLowerCase());
  if (!kind || !locator) {
    return null;
  }
  return { kind, language, locator, slug: slug ?? null };
}

/** Longest slug kept; titles past this are cut at a word boundary. */
const MAX_SLUG_LENGTH = 80;

/**
 * Turns a title into a URL slug: lowercase, with every run of characters
 * that aren't letters or digits (in any script) collapsed to a single hyphen.
 * Returns "" when nothing usable is left, so the caller can drop the segment.
 */
export function slugifyTitle(title: string | null | undefined): string {
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

/** Builds `/{lang}/{segment}/{locator}[/{slug}]`. */
export function buildSharedPagePath(params: {
  kind: SharedPageKind;
  language: string;
  locator: string;
  title: string | null | undefined;
}): string {
  const { kind, language, locator, title } = params;
  const slug = slugifyTitle(title);
  const path = `/${encodeURIComponent(language)}/${SHARED_PAGE_PATH_SEGMENTS[kind]}/${encodeURIComponent(locator)}`;
  return slug ? `${path}/${encodeURIComponent(slug)}` : path;
}
