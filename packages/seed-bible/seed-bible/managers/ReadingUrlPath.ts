import {
  findClosestBookId,
  getBookId,
  getBookSlug,
  type BookId,
} from "./BibleDataManager";

/**
 * Fixed anchor for the URL scheme's "fully default" state. Deliberately not
 * derived from any per-request/browser-detected language (that would make
 * the canonical URL for the same content vary by visitor) — this is the one
 * language for which the `{lang}` path segment is omitted.
 */
export const DEFAULT_UI_LANGUAGE = "en";

/** How the book segment was resolved to a `BookId`. */
export type BookMatchKind = "exact" | "fuzzy" | "unresolved";

/**
 * Removes the deployment prefix (e.g. "/b/some-branch") from a pathname,
 * leaving the root-relative app path. A pathname that doesn't start with
 * `basePath` — and the root deployment, where `basePath` is "" — comes back
 * unchanged.
 */
export function stripBasePath(pathname: string, basePath: string): string {
  return basePath.length > 0 && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
}

/**
 * Strips `basePath` and splits the remaining pathname into its non-empty,
 * decoded segments. A segment with a malformed percent-escape (a lone `%`,
 * or a truncated multi-byte sequence) is passed through as-is rather than
 * decoded — `decodeURIComponent` throws a `URIError` on those rather than
 * returning a best-effort string, and that's a routine occurrence on the
 * open web (bots probing odd paths, a copy-pasted link with a stray `%`),
 * not a contrived edge case.
 *
 * Falling back to the raw segment (instead of discarding the whole path)
 * preserves the segment count, so a malformed book segment in an otherwise
 * canonical-shaped path still reaches `getBookId`/`findClosestBookId` — which
 * correctly fail to match it — and comes out `bookMatch: "unresolved"`
 * rather than being mistaken for a differently-shaped or unparseable path.
 */
export function splitPathSegments(
  pathname: string,
  basePath: string
): string[] {
  const raw = stripBasePath(pathname, basePath).split("/").filter(Boolean);
  return raw.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}

export interface ParsedReadingPath {
  /**
   * Explicit language segment, or null when the path omitted it (3-segment
   * form). Callers should treat null as `DEFAULT_UI_LANGUAGE`.
   */
  language: string | null;
  translationId: string;
  /** Null only when `bookMatch` is "unresolved". */
  bookId: BookId | null;
  /** The decoded book segment as given in the URL, always present. */
  rawBookSegment: string;
  chapter: number;
  bookMatch: BookMatchKind;
}

/**
 * Parses `[/{lang}]/{translationId}/{bookSlug}/{chapter}` out of a URL path,
 * ignoring the deployment prefix. Requires exactly 3 or 4 segments with a
 * positive integer chapter; returns null for anything else (the old
 * 2-segment `/{book}/{chapter}` shape, a bare root, or garbage) so callers
 * can fall back to legacy query params.
 *
 * Unlike the URL "shape" (segment count), the book segment is allowed to
 * fail resolution and still produce a result: it's tried as an exact match
 * first, then a close-typo fuzzy match, and only becomes `bookMatch:
 * "unresolved"` (with `bookId: null`) when neither succeeds — callers that
 * only need language/translation/chapter (which don't depend on book
 * resolution) can safely ignore `bookMatch`; callers building a redirect or
 * deciding "not found" need to check it.
 */
export function parseReadingPath(
  pathname: string,
  basePath: string
): ParsedReadingPath | null {
  const segments = splitPathSegments(pathname, basePath);

  let language: string | undefined | null;
  let translationId: string | undefined;
  let bookSeg: string | undefined;
  let chapterSeg: string | undefined;

  if (segments.length === 4) {
    [language, translationId, bookSeg, chapterSeg] = segments;
  } else if (segments.length === 3) {
    language = null;
    [translationId, bookSeg, chapterSeg] = segments;
  } else {
    return null;
  }

  const chapterValue = chapterSeg ? Number(chapterSeg) : NaN;
  const chapter =
    Number.isFinite(chapterValue) && chapterValue > 0
      ? Math.floor(chapterValue)
      : null;

  if (!chapter || !translationId || !bookSeg) {
    return null;
  }

  const exactBookId = getBookId(bookSeg);
  const fuzzyBookId = exactBookId ? null : findClosestBookId(bookSeg);
  const bookId = exactBookId ?? fuzzyBookId;
  const bookMatch: BookMatchKind = exactBookId
    ? "exact"
    : fuzzyBookId
      ? "fuzzy"
      : "unresolved";

  return {
    language: language ?? null,
    translationId,
    bookId,
    rawBookSegment: bookSeg,
    chapter,
    bookMatch,
  };
}

/**
 * Builds the canonical reading path from resolved state: always the explicit
 * `/{lang}/{translationId}/{bookSlug}/{chapter}` form. A URL that omits
 * `{lang}` is a redirect entry point, not a second valid canonical shape —
 * see `legacyReadingUrlRedirect` in `entry-ssr.tsx`, which promotes every
 * 3-segment request to this form.
 */
export function buildReadingPath(params: {
  language: string;
  translationId: string;
  bookId: BookId;
  chapter: number;
}): string {
  const { language, translationId, bookId, chapter } = params;
  const bookSlug = getBookSlug(bookId);
  const encodedTranslation = encodeURIComponent(translationId);
  return `/${encodeURIComponent(language)}/${encodedTranslation}/${bookSlug}/${chapter}`;
}

/** Query params that used to carry the reading position before it moved into the path. */
const LEGACY_POSITION_PARAMS = [
  "book",
  "chapter",
  "translation",
  "translationId",
  "lang",
];

/**
 * Rewrites the reading position inside an existing app URL, keeping the
 * origin, the deployment prefix, the language segment already in the path,
 * and any unrelated query params (`?verse=`, `?sessionId=`, an extension's
 * own params).
 *
 * This is what anything that *hands out* a link should use — the share
 * buttons, scripture reference links — rather than setting `?book=`/`?chapter=`
 * on top of the current URL. Since the position moved into the path, those
 * params no longer win: `getInitialFirstTabBookId` and friends read the path
 * first and only fall back to the query, so a link that sets them alongside a
 * path that says something else silently opens the path's position instead.
 * They're stripped here for the same reason.
 */
export function buildReadingUrl(params: {
  /** The URL to rewrite — normally the page's current one. */
  currentUrl: URL;
  basePath: string;
  translationId: string;
  bookId: BookId;
  chapter: number;
  /**
   * Language for the path when the current URL has none to inherit. Callers
   * that can resolve one for the translation (`uiLocaleForDefaultTranslation`,
   * `bibleLanguageToUiLocale`) should pass it; defaults to
   * {@link DEFAULT_UI_LANGUAGE}.
   */
  fallbackLanguage?: string;
}): URL {
  const {
    currentUrl,
    basePath,
    translationId,
    bookId,
    chapter,
    fallbackLanguage,
  } = params;

  const parsed = parseReadingPath(currentUrl.pathname, basePath);
  const url = new URL(currentUrl.href);
  url.pathname = `${basePath}${buildReadingPath({
    // Keep whatever language the page is already being read in, so a link
    // handed out while reading in Spanish stays Spanish.
    language:
      parsed?.language?.toLowerCase() ??
      fallbackLanguage ??
      DEFAULT_UI_LANGUAGE,
    translationId,
    bookId,
    chapter,
  })}`;

  for (const key of LEGACY_POSITION_PARAMS) {
    url.searchParams.delete(key);
  }

  return url;
}

/**
 * Whether `url` points at a specific reading position (the canonical
 * `/{lang}/{translationId}/{book}/{chapter}` path). No query-param fallback
 * needed — `entry-ssr.tsx` already redirects legacy `?book=`/`?chapter=`
 * URLs onto the canonical path before the app ever sees them.
 */
export function hasReadingUrlPosition(url: URL, basePath: string): boolean {
  return parseReadingPath(url.pathname, basePath) !== null;
}
