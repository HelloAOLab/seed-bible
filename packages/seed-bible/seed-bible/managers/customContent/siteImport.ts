/**
 * Importing a whole website from Common Crawl (design doc §5.7): reading
 * the site the owner typed, and deciding which of its archived pages are
 * worth offering. Shared by the editor and the import worker.
 */

/** A site as the owner typed it, reduced to what the archive is searched by. */
export interface SiteAddress {
  /** Lowercase, without `www.`: Common Crawl's index ignores it too. */
  host: string;
  /** Starts and ends with `/`; `/` for the whole site. */
  pathPrefix: string;
}

const HOST_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/**
 * Reads `gracecommunity.org/sermons`, `https://www.gracecommunity.org/sermons/`
 * and the like. Null for anything that isn't a public host name (no IP
 * addresses, ports or credentials), since it only ever becomes a search
 * pattern for the archive's index.
 */
export function parseSiteAddress(input: string): SiteAddress | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
  } catch {
    return null;
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.port ||
    url.username ||
    url.password
  ) {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!HOST_PATTERN.test(host)) {
    return null;
  }
  const path = url.pathname.replace(/\/+/g, "/");
  return {
    host,
    pathPrefix: path.endsWith("/") ? path : `${path}/`,
  };
}

/** The index query's URL pattern: everything under the site's path. */
export function siteSearchPattern(site: SiteAddress): string {
  return `${site.host}${site.pathPrefix}*`;
}

/** The site written back the way owners type it, e.g. `gracecommunity.org/sermons/`. */
export function formatSiteAddress(site: SiteAddress): string {
  return `${site.host}${site.pathPrefix === "/" ? "" : site.pathPrefix}`;
}

/**
 * Listing and archive pages: tags, categories, "page 2" of a listing,
 * feeds, comment replies. They name many posts at once, so they're noise
 * for finding passages, and are left out unless the owner includes them.
 */
export const DEFAULT_SITE_EXCLUDES: readonly string[] = [
  "*/tag/*",
  "*/tags/*",
  "*/category/*",
  "*/categories/*",
  "*/author/*",
  "*/page/[0-9]*",
  "*/feed",
  "*/feed/*",
  "*/wp-json/*",
  "*/search*",
  "*?replytocom=*",
  "*?s=*",
];

/**
 * Whether a page's path (with its query) matches a pattern the owner typed.
 * `*` stands for anything and `[0-9]` for a digit; a pattern without `*`
 * matches its own path and everything under it, so `/sermons` covers
 * `/sermons/good-shepherd`.
 */
export function matchesPathPattern(path: string, pattern: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return false;
  }
  const normalized =
    trimmed.startsWith("/") || trimmed.startsWith("*")
      ? trimmed
      : `/${trimmed}`;
  // Brackets pass through, so `[0-9]` works as a digit.
  let source = normalized
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|\\]/g, "\\$&"))
    .join(".*");
  if (!trimmed.includes("*")) {
    source += normalized.endsWith("/") ? ".*" : "(?:[/?].*)?";
  }
  try {
    return new RegExp(`^${source}$`, "i").test(path);
  } catch {
    return false;
  }
}

/**
 * Whether an archived page should be offered: it's under one of the
 * owner's `include` patterns (any page, when there are none) and under none
 * of the `exclude` ones or the built-in noise patterns.
 */
export function keepSitePage(
  url: string,
  filters: { include?: readonly string[]; exclude?: readonly string[] }
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const path = `${parsed.pathname}${parsed.search}`;
  const include = filters.include ?? [];
  if (include.length > 0 && !include.some((p) => matchesPathPattern(path, p))) {
    return false;
  }
  return ![...DEFAULT_SITE_EXCLUDES, ...(filters.exclude ?? [])].some((p) =>
    matchesPathPattern(path, p)
  );
}

/** The folder a page is grouped under in the page picker: its path's first segment. */
export function siteFolder(url: string): string {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean);
    return segment.length > 1 ? `/${segment[0]}/` : "/";
  } catch {
    return "/";
  }
}

/** Reads Common Crawl's 14-digit capture time (`20260914083000`) as a date. */
export function parseCaptureTimestamp(timestamp: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?$/.exec(
    timestamp
  );
  if (!match) {
    return null;
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = match;
  const date = new Date(Date.UTC(+y!, +mo! - 1, +d!, +h, +mi, +s));
  return Number.isNaN(date.getTime()) ? null : date;
}
