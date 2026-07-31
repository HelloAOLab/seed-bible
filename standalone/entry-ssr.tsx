import { renderToStringAsync } from "preact-render-to-string";
import { Main } from "../packages/seed-bible/seed-bible/app/main";
import type { AppConfig } from "../packages/seed-bible/seed-bible/app/appConfig";
import { createSeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  findClosestBookId,
  getBookId,
  type BookId,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  getDefaultTranslationForLanguage,
  uiLocaleForDefaultTranslation,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  DEFAULT_UI_LANGUAGE,
  buildReadingPath,
  parseReadingPath,
  stripBasePath,
} from "@packages/seed-bible/seed-bible/managers/ReadingUrlPath";

/** A single chunk record from a Vite client manifest. */
interface ManifestChunk {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
  imports?: string[];
}

export type ViteManifest = Record<string, ManifestChunk>;

export interface RenderOptions {
  /** Full request path including the deployment prefix, e.g. "/d/branch-x/?book=GEN". */
  path: string;

  /** Deployment config injected into the page and passed to the app. */
  config: AppConfig;
  /**
   * The HTML that the app should be injected into.
   *
   * Should have the following placeholders:
   * - `<!--APP_HTML-->` where the app's rendered HTML should be injected.
   * - `<!--CONFIG_JSON-->` where the JSON-serialized config should be injected (for hydration).
   * - `<!--META-->` where any additional meta tags should be injected (optional).
   *
   * The host server loads this from disk at startup and passes it to the render function on each request, allowing it to be customized or overridden per request if needed.
   * By default, it is just the contents of `index.html` in the project root.
   */
  html: string;
}

const escapeForScript = (json: string): string => json.replace(/</g, "\\u003c");

/**
 * Detects a URL that isn't already the canonical
 * `/{lang}/{translationId}/{bookSlug}/{chapter}` form and computes the path
 * to redirect to. Three shapes are recognized: an already-4-segment path
 * whose segments don't spell the canonical form exactly; a 3-segment path,
 * which always redirects since the language segment is never optional in
 * the canonical form; a bare root with legacy `?book=`/`?chapter=` (and
 * optionally `?translation=`/`?translationId=`/`?lang=`) query params; and
 * the prior `/{book}/{chapter}` path format (no translation/language).
 * Returns null when the URL is already canonical, or when the book doesn't
 * resolve at all — falling through to a normal render (see `render()`'s
 * `notFound` handling for the latter).
 *
 * For the 4-segment case the test is deliberately "does this path differ
 * from `buildReadingPath` of what it resolved to", not "was the book a
 * fuzzy match". `getBookId` resolves a lot more than exact slugs — aliases
 * ("gen"), other casings ("Genesis"), and, via its `startsWith` fallback,
 * anything that merely begins with a book name ("luke-skywalker" → Luke).
 * Keying off the fuzzy flag left every one of those served 200 at its own
 * indexable URL, so a real typo got canonicalized while junk did not.
 * Comparing against the rebuilt path catches all of them, plus zero-padded
 * chapters and trailing slashes, with one rule.
 *
 * A 3-segment path has no language segment to compare, so it always
 * redirects (when the book resolves) — to the language the translation
 * itself is written in when that's known without a network call (see
 * `uiLocaleForDefaultTranslation`), or English otherwise. `render()` gives
 * this specific promotion a 302, since it's the visitor's first landing on
 * an ambiguous URL, not a permanent correction of a mistyped one.
 *
 * This is safe from redirect loops because every `BOOK_SLUGS` entry
 * round-trips through `getBookId` (locked in by a test in
 * `BibleDataManager.test.ts`), so the path this returns always compares
 * equal on the next request.
 */
export function legacyReadingUrlRedirect(
  path: string,
  basePath: string
): string | null {
  const url = new URL(path, "http://ssr.local");

  const parsed = parseReadingPath(url.pathname, basePath);
  if (parsed) {
    // Resolved to nothing — no confident target to send them to, so fall
    // through to the 404 render instead of guessing.
    if (!parsed.bookId) {
      return null;
    }

    const language =
      parsed.language !== null
        ? parsed.language.toLowerCase()
        : (uiLocaleForDefaultTranslation(parsed.translationId) ??
          DEFAULT_UI_LANGUAGE);

    const readingPath = buildReadingPath({
      language,
      translationId: parsed.translationId,
      bookId: parsed.bookId,
      chapter: parsed.chapter,
    });
    if (stripBasePath(url.pathname, basePath) === readingPath) {
      return null;
    }
    return `${basePath}${readingPath}${url.search}`;
  }

  const segments = stripBasePath(url.pathname, basePath)
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  let bookId: BookId | null = null;
  let chapter = 1;

  if (segments.length === 2) {
    // The immediately-prior /{book}/{chapter} format.
    const bookSegment = segments[0]!;
    const candidateBookId =
      getBookId(bookSegment) ?? findClosestBookId(bookSegment);
    const chapterValue = Number(segments[1]);
    if (candidateBookId && Number.isFinite(chapterValue) && chapterValue > 0) {
      bookId = candidateBookId;
      chapter = Math.floor(chapterValue);
    }
  } else if (segments.length === 0) {
    // Bare root — only a legacy redirect target if `?book=` says so.
    const bookParam = url.searchParams.get("book");
    if (bookParam) {
      bookId = getBookId(bookParam) ?? findClosestBookId(bookParam);
      const chapterValue = Number(url.searchParams.get("chapter"));
      chapter =
        Number.isFinite(chapterValue) && chapterValue > 0
          ? Math.floor(chapterValue)
          : 1;
    }
  }

  if (!bookId) {
    return null;
  }

  const language = url.searchParams.get("lang") ?? DEFAULT_UI_LANGUAGE;
  const translationId =
    url.searchParams.get("translationId") ??
    url.searchParams.get("translation") ??
    getDefaultTranslationForLanguage(language).id;

  const readingPath = buildReadingPath({
    language,
    translationId,
    bookId,
    chapter,
  });

  const remainingParams = new URLSearchParams(url.search);
  for (const key of [
    "book",
    "chapter",
    "translation",
    "translationId",
    "lang",
  ]) {
    remainingParams.delete(key);
  }
  const query = remainingParams.toString();

  return `${basePath}${readingPath}${query ? `?${query}` : ""}`;
}

/**
 * Server-side renders the app to a complete HTML document.
 *
 * The app shell (chrome, theme, head) renders on the server; verse content
 * is fetched and filled in by the client after hydration — standard for a
 * data-driven SPA that does not block first paint on network fetches.
 */
export async function render(
  options: RenderOptions
): Promise<
  | { html: string; notFound?: true }
  | { redirectTo: string; redirectStatus?: number }
> {
  const { config } = options;

  const redirectTo = legacyReadingUrlRedirect(options.path, config.basePath);
  if (redirectTo) {
    // A 3-segment request (no language segment) is promoted with a 302: it's
    // the visitor's first landing on an ambiguous URL, not a permanent
    // correction of a mistyped one, so it shouldn't be cached as if the
    // 3-segment URL always redirects here. Every other correction this
    // function makes (typos, casing, zero-padding, legacy shapes) is
    // header-independent and permanent, so it keeps the default 301.
    const requestedLanguage = parseReadingPath(
      new URL(options.path, "http://ssr.local").pathname,
      config.basePath
    )?.language;
    return {
      redirectTo,
      ...(requestedLanguage === null ? { redirectStatus: 302 } : {}),
    };
  }

  // A pure URL-level check (no network involved): a canonical-shaped path
  // whose book segment doesn't resolve even via a fuzzy match has nothing
  // confident to redirect to, so the app still renders (its own "book not
  // found" state), but the response should be a real 404, not 200 — see the
  // SEO discussion this came out of: a 200 with substitute content is a
  // "soft 404" that search engines penalize and can index as duplicate
  // content.
  //
  // Known gap, deliberately not closed here: this only asks "is this a real
  // book", not "does *this translation* have it". A book that exists but is
  // absent from the requested translation — Deuterocanon in most of them —
  // resolves fine, so it returns 200 and the reader shows the same "book not
  // found" state. That is a soft 404 of exactly the kind above, one layer
  // down. Catching it would mean fetching the translation's book list before
  // responding, which puts a network round trip in front of every render;
  // the reader already fetches that list and offers a way out, so the cost
  // isn't worth it for URLs nothing links to.
  const parsedForNotFound = parseReadingPath(
    new URL(options.path, "http://ssr.local").pathname,
    config.basePath
  );
  const notFound = parsedForNotFound?.bookMatch === "unresolved";

  const href = `http://ssr.local${options.path}`;
  const state = createSeedBibleState({
    config,
    initialHref: href,
  });

  // Block until the detected language's translations are loaded so the
  // server-rendered HTML (and og:locale meta below) is in the right language
  // rather than the bundled "en" fallback.
  await state.i18n.ready;

  const [appHtml] = await Promise.all([
    renderToStringAsync(
      <Main initialState={state} config={config} initialHref={href} />
    ),
  ]);

  const metaHtml = await renderToStringAsync(
    <>
      <meta
        name="theme-color"
        content="#FFFFFF"
        media="(prefers-color-scheme: light)"
      />
      <meta
        name="theme-color"
        content="#000000"
        media="(prefers-color-scheme: dark)"
      />
      <meta name="description" content={state.app.description.value} />
      <meta name="og:locale" content={state.i18n.language.value} />
      <meta name="og:locale:alternate" content={state.i18n.defaultLanguage} />
      <meta property="og:title" content={state.app.socialTitle.value} />
      <meta property="og:description" content={state.app.description.value} />
      <meta property="og:url" content={state.app.canonicalUrl.value} />
      <meta name="og:site_name" content={state.app.siteName.value} />
      <link rel="canonical" href={state.app.canonicalUrl.value} />
      <title>{state.app.title.value}</title>
    </>
  );

  const configJson = escapeForScript(JSON.stringify(config));

  return {
    html: options.html
      .replace("<!-- META -->", metaHtml) // No additional meta tags for now, but this allows it to be customized per request in the future if needed.
      .replace("<!-- CONFIG_JSON -->", configJson)
      .replace("<!-- APP_HTML -->", appHtml),
    ...(notFound ? { notFound: true as const } : {}),
  };
}
