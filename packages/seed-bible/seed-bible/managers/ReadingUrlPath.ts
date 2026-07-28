import { getBookId, getBookSlug, type BookId } from "./BibleDataManager";

/**
 * Fixed anchor for the URL scheme's "fully default" state. Deliberately not
 * derived from any per-request/browser-detected language (that would make
 * the canonical URL for the same content vary by visitor) — this is the one
 * language for which the `{lang}` path segment is omitted.
 */
export const DEFAULT_UI_LANGUAGE = "en";

export interface ParsedReadingPath {
  /**
   * Explicit language segment, or null when the path omitted it (3-segment
   * form). Callers should treat null as `DEFAULT_UI_LANGUAGE`.
   */
  language: string | null;
  translationId: string;
  bookId: BookId;
  chapter: number;
}

/**
 * Parses `[/{lang}]/{translationId}/{bookSlug}/{chapter}` out of a URL path,
 * ignoring the deployment prefix. Requires exactly 3 or 4 segments with a
 * resolvable book and a positive integer chapter; returns null for anything
 * else (the old 2-segment `/{book}/{chapter}` shape, a bare root, or
 * garbage) so callers can fall back to legacy query params.
 */
export function parseReadingPath(
  pathname: string,
  basePath: string
): ParsedReadingPath | null {
  const stripped =
    basePath.length > 0 && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length)
      : pathname;
  const segments = stripped
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

  const bookId = bookSeg ? getBookId(bookSeg) : null;
  const chapterValue = chapterSeg ? Number(chapterSeg) : NaN;
  const chapter =
    Number.isFinite(chapterValue) && chapterValue > 0
      ? Math.floor(chapterValue)
      : null;

  if (!bookId || !chapter || !translationId) {
    return null;
  }

  return { language: language ?? null, translationId, bookId, chapter };
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
 */
export function buildReadingPath(params: {
  language: string;
  translationId: string;
  bookId: BookId;
  chapter: number;
  defaultTranslationId: string;
}): string {
  const { language, translationId, bookId, chapter, defaultTranslationId } =
    params;
  const bookSlug = getBookSlug(bookId);
  const encodedTranslation = encodeURIComponent(translationId);
  const isFullyDefault =
    language === DEFAULT_UI_LANGUAGE && translationId === defaultTranslationId;

  if (isFullyDefault) {
    return `/${encodedTranslation}/${bookSlug}/${chapter}`;
  }

  return `/${encodeURIComponent(language)}/${encodedTranslation}/${bookSlug}/${chapter}`;
}
