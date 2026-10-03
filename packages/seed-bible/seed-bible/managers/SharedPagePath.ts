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
  /**
   * The 1-based step being played (a playlist playing at its own path), or
   * null for the page itself (its intro modal).
   */
  step: number | null;
}

/**
 * Stands in for the title slug in a step path whose record has no title, or
 * whose title isn't known (an old `?playlist=` link being redirected). A step
 * path needs some slug: `/{lang}/{segment}/{locator}/{x}` is always read as a
 * slug, so a title like "2024" can't be mistaken for step 2024.
 */
export const SHARED_PAGE_SLUG_PLACEHOLDER = "-";

/**
 * Parses a shared content page, `/{lang}/{segment}/{locator}[/{slug}[/{step}]]`,
 * where `segment` names the kind of content (see `SHARED_PAGE_PATH_SEGMENTS`).
 * The slug only exists for search engines and link previews, so it is never
 * used to find the record and a stale one (the content was renamed) still
 * opens it. A trailing step (1-based) means the content is playing at that
 * step.
 */
export function parseSharedPagePath(
  pathname: string,
  basePath: string
): ParsedSharedPagePath | null {
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
  const kind = (
    Object.keys(SHARED_PAGE_PATH_SEGMENTS) as SharedPageKind[]
  ).find((k) => SHARED_PAGE_PATH_SEGMENTS[k] === pageSeg.toLowerCase());
  if (!kind || !locator) {
    return null;
  }
  let step: number | null = null;
  if (stepSeg !== undefined) {
    if (!/^[1-9]\d*$/.test(stepSeg)) {
      return null;
    }
    step = Number(stepSeg);
  }
  return { kind, language, locator, slug: slug ?? null, step };
}

/**
 * Splits a `{recordName}.{address}` record locator, the form shared links and
 * play history use to name a playlist or reading plan. Splits on the last dot,
 * since a record name can contain dots and an address doesn't. Null when the
 * locator is missing or has nothing on one side of that dot.
 */
export function parseRecordLocator(
  locator: string | null | undefined
): { recordName: string; address: string } | null {
  if (!locator) {
    return null;
  }
  const lastDot = locator.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === locator.length - 1) {
    return null;
  }
  return {
    recordName: locator.slice(0, lastDot),
    address: locator.slice(lastDot + 1),
  };
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

/**
 * Builds `/{lang}/{segment}/{locator}[/{slug}]`, or with `step` (1-based) the
 * playing path `/{lang}/{segment}/{locator}/{slug}/{step}`.
 */
export function buildSharedPagePath(params: {
  kind: SharedPageKind;
  language: string;
  locator: string;
  title: string | null | undefined;
  step?: number | null;
}): string {
  const { kind, language, locator, title, step } = params;
  const slug = slugifyTitle(title);
  const path = `/${encodeURIComponent(language)}/${SHARED_PAGE_PATH_SEGMENTS[kind]}/${encodeURIComponent(locator)}`;
  if (step != null) {
    return `${path}/${encodeURIComponent(slug || SHARED_PAGE_SLUG_PLACEHOLDER)}/${step}`;
  }
  return slug ? `${path}/${encodeURIComponent(slug)}` : path;
}

/** Parses a playlist's page or playing path; null for anything else. */
export function parsePlaylistPagePath(
  pathname: string,
  basePath: string
): ParsedSharedPagePath | null {
  const parsed = parseSharedPagePath(pathname, basePath);
  return parsed?.kind === "playlist" ? parsed : null;
}
