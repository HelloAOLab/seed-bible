import { renderToStringAsync } from "preact-render-to-string";
import { Main } from "../packages/seed-bible/seed-bible/app/main";
import type { AppConfig } from "../packages/seed-bible/seed-bible/app/appConfig";
import { createSeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  findClosestBookId,
  getBookId,
  type BookId,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { getDefaultTranslationForLanguage } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  DEFAULT_UI_LANGUAGE,
  buildReadingPath,
  parseReadingPath,
  stripBasePath,
} from "@packages/seed-bible/seed-bible/managers/ReadingUrlPath";
import { getPreferredSupportedLanguage } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

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
 * `[/{lang}]/{translationId}/{bookSlug}/{chapter}` form and computes the
 * path to 301 to. Three shapes are recognized: an already-canonical (3/4
 * segment) path whose segments don't spell the canonical form exactly; a
 * bare root with legacy `?book=`/`?chapter=` (and optionally
 * `?translation=`/`?translationId=`/`?lang=`) query params; and the prior
 * `/{book}/{chapter}` path format (no translation/language). Returns null
 * when the URL is already canonical, or when the book doesn't resolve at
 * all — falling through to a normal render (see `render()`'s `notFound`
 * handling for the latter).
 *
 * For the canonical-shaped case the test is deliberately "does this path
 * differ from `buildReadingPath` of what it resolved to", not "was the
 * book a fuzzy match". `getBookId` resolves a lot more than exact slugs —
 * aliases ("gen"), other casings ("Genesis"), and, via its `startsWith`
 * fallback, anything that merely begins with a book name
 * ("luke-skywalker" → Luke). Keying off the fuzzy flag left every one of
 * those served 200 at its own indexable URL, so a real typo got
 * canonicalized while junk did not. Comparing against the rebuilt path
 * catches all of them, plus zero-padded chapters and trailing slashes,
 * with one rule.
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

    const readingPath = buildReadingPath({
      language: (parsed.language ?? DEFAULT_UI_LANGUAGE).toLowerCase(),
      translationId: parsed.translationId,
      bookId: parsed.bookId,
      chapter: parsed.chapter,
      defaultTranslationId:
        getDefaultTranslationForLanguage(DEFAULT_UI_LANGUAGE).id,
      // Keep the shape the request used. Collapsing an explicit
      // "/en/AAB/john/3" down to "/AAB/john/3" would hand it straight to
      // `acceptLanguageRedirect`, which sends it back up again — an
      // infinite loop. Promoting 3 segments to 4 is that function's job,
      // as a 302 with `Vary`, because the target depends on the request
      // headers; this correction is header-independent and permanent.
      forceExplicitLanguage: parsed.language !== null,
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
    defaultTranslationId:
      getDefaultTranslationForLanguage(DEFAULT_UI_LANGUAGE).id,
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
 * The 3-segment `{translationId}/{bookSlug}/{chapter}` form omits `{lang}`,
 * which canonically means `DEFAULT_UI_LANGUAGE` ("en") — but a first-time
 * visitor landing there (a shared link, a search result) has almost never
 * chosen English on purpose; their browser just wasn't asked. If their
 * `Accept-Language` header names a language this app actually supports,
 * redirect to the explicit 4-segment form for that language instead of
 * silently rendering in English. When no `Accept-Language` header was sent
 * at all (most often a crawler or a bare HTTP client, not a browser),
 * there is nothing to negotiate — redirect to the explicit English URL
 * rather than silently rendering the ambiguous 3-segment form as English.
 *
 * Deliberately a redirect (not just an SSR language switch at the same URL):
 * the URL itself is meant to reflect the language being read in — see the
 * URL scheme's four examples — so a browser-language visitor should end up
 * with that language's URL in their address bar and history, not a 3-segment
 * URL that quietly rendered as something else.
 *
 * Only fires for an already-exact book match; a fuzzy or unresolved one is
 * handled by `legacyReadingUrlRedirect`/`render()`'s `notFound` check
 * instead, and `render()` only calls this once those have both declined.
 *
 * This is content negotiation, not a canonical-URL correction: a different
 * visitor to the exact same 3-segment URL gets a different destination (or
 * none), so unlike the redirects above this must be a 302 (temporary), never
 * a 301 — a 301 would tell caches and crawlers this URL always redirects
 * here, collapsing every visitor onto one visitor's language. The caller is
 * responsible for pairing it with a `Vary: Accept-Language` response header
 * so shared caches don't serve one visitor's redirect (or lack of one) to
 * another with a different header.
 */
export function acceptLanguageRedirect(
  path: string,
  basePath: string,
  acceptedLanguages: string[]
): string | null {
  const url = new URL(path, "http://ssr.local");
  const parsed = parseReadingPath(url.pathname, basePath);
  if (
    !parsed ||
    parsed.language !== null ||
    parsed.bookMatch !== "exact" ||
    !parsed.bookId
  ) {
    return null;
  }

  const bookId = parsed.bookId;
  const buildRedirect = (language: string): string => {
    const readingPath = buildReadingPath({
      language,
      translationId: parsed.translationId,
      bookId,
      chapter: parsed.chapter,
      defaultTranslationId:
        getDefaultTranslationForLanguage(DEFAULT_UI_LANGUAGE).id,
      // Always land on the explicit 4-segment form: the omitted form is
      // exactly the 3-segment URL this redirect started from, so omitting it
      // here would just redirect the visitor back to themselves.
      forceExplicitLanguage: true,
    });
    return `${basePath}${readingPath}${url.search}`;
  };

  // No header at all means there is no preference to negotiate against —
  // land explicitly on English rather than rendering the ambiguous
  // 3-segment form as English with nothing in the address bar to show for
  // it. A header that was sent but named only unsupported languages is
  // different: that visitor does have a preference, it's just one this app
  // can't serve, so it falls through to the silent English render below.
  if (acceptedLanguages.length === 0) {
    return buildRedirect(DEFAULT_UI_LANGUAGE);
  }

  const preferred = getPreferredSupportedLanguage(acceptedLanguages);
  if (!preferred || preferred === DEFAULT_UI_LANGUAGE) {
    return null;
  }

  return buildRedirect(preferred);
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
  | { redirectTo: string; redirectStatus?: number; vary?: string }
> {
  const { config } = options;

  const redirectTo = legacyReadingUrlRedirect(options.path, config.basePath);
  if (redirectTo) {
    return { redirectTo };
  }

  const languageRedirectTo = acceptLanguageRedirect(
    options.path,
    config.basePath,
    config.acceptedLanguages
  );
  if (languageRedirectTo) {
    return {
      redirectTo: languageRedirectTo,
      redirectStatus: 302,
      vary: "Accept-Language",
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
