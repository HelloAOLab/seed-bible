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
  const segments = stripBasePath(pathname, basePath)
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

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
 * Builds the canonical reading path from resolved state. The `{lang}`
 * segment is included unless both `language` and `translationId` match the
 * "fully default" state (`DEFAULT_UI_LANGUAGE` + that language's own default
 * translation) — see the four examples worked through in the URL scheme
 * design. `defaultTranslationId` is supplied by the caller (typically
 * `getDefaultTranslationForLanguage(DEFAULT_UI_LANGUAGE).id`) rather than
 * looked up here, keeping this module free of a BibleReadingManager
 * dependency.
 *
 * `forceExplicitLanguage` always includes the `{lang}` segment, even for the
 * "fully default" state — for a caller that specifically needs an explicit,
 * self-describing URL rather than the shortest canonical one (e.g. a
 * language-negotiation redirect landing a visitor on English: the omitted
 * form is indistinguishable from "not yet negotiated" and would send them
 * right back through the same redirect).
 */
export function buildReadingPath(params: {
  language: string;
  translationId: string;
  bookId: BookId;
  chapter: number;
  defaultTranslationId: string;
  forceExplicitLanguage?: boolean;
}): string {
  const {
    language,
    translationId,
    bookId,
    chapter,
    defaultTranslationId,
    forceExplicitLanguage,
  } = params;
  const bookSlug = getBookSlug(bookId);
  const encodedTranslation = encodeURIComponent(translationId);
  const isFullyDefault =
    !forceExplicitLanguage &&
    language === DEFAULT_UI_LANGUAGE &&
    translationId === defaultTranslationId;

  if (isFullyDefault) {
    return `/${encodedTranslation}/${bookSlug}/${chapter}`;
  }

  return `/${encodeURIComponent(language)}/${encodedTranslation}/${bookSlug}/${chapter}`;
}
