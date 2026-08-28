import { renderToStringAsync } from "preact-render-to-string";
import { Main } from "../packages/seed-bible/seed-bible/app/main";
import type { AppConfig } from "../packages/seed-bible/seed-bible/app/appConfig";
import { DEFAULT_APP_CONFIG } from "../packages/seed-bible/seed-bible/app/appConfig";
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
  splitPathSegments,
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
   * - `<!--SEED_JSON-->` where the JSON-serialized API response snapshot
   *   should be injected, so the client can seed its own API cache with data
   *   the server already fetched instead of re-fetching it.
   * - `<!--META-->` where any additional meta tags should be injected (optional).
   *
   * The host server loads this from disk at startup and passes it to the render function on each request, allowing it to be customized or overridden per request if needed.
   * By default, it is just the contents of `index.html` in the project root.
   */
  html: string;
}

const escapeForScript = (json: string): string => json.replace(/</g, "\\u003c");

/**
 * Substitutes a literal placeholder for a value, without `String.replace`'s
 * special handling of `$&`, `` $` ``, `$'`, `$$`, and `$1`-`$99` in the
 * *replacement* string — which applies even when the search argument is a
 * plain string, not a `RegExp`. Every value substituted below ultimately
 * comes from live Bible translation content this project doesn't control
 * the source of, so a translation containing a literal `$1` (a footnote
 * referencing a dollar amount, say) would otherwise corrupt that one
 * substitution silently instead of throwing.
 */
function replacePlaceholder(
  source: string,
  placeholder: string,
  value: string
): string {
  return source.split(placeholder).join(value);
}

/**
 * Detects a URL that isn't already the canonical
 * `/{lang}/{translationId}/{bookSlug}/{chapter}` form, for requests that
 * already have an explicit language somewhere — a 4-segment path, or a
 * `?lang=` query param — and computes the path to redirect to. Always a
 * 301: every correction this makes (typos, casing, zero-padding, folding
 * legacy query params into the path) is header-independent and permanent,
 * since the only language it ever uses is the one the request already gave.
 *
 * A 3-segment path, or a legacy shape with no `?lang=`, has no explicit
 * language at all — those are entirely `acceptLanguageRedirect`'s job (a
 * 302, since the target then depends on the translation's known language or
 * the visitor's `Accept-Language`), so this function declines them (returns
 * null) rather than guessing a language for them itself.
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
    // No explicit language segment (3-segment form) — nothing deterministic
    // to correct to; `acceptLanguageRedirect` decides the language.
    if (parsed.language === null) {
      return null;
    }
    // Resolved to nothing — no confident target to send them to, so fall
    // through to the 404 render instead of guessing.
    if (!parsed.bookId) {
      return null;
    }

    const readingPath = buildReadingPath({
      language: parsed.language.toLowerCase(),
      translationId: parsed.translationId,
      bookId: parsed.bookId,
      chapter: parsed.chapter,
    });
    if (stripBasePath(url.pathname, basePath) === readingPath) {
      return null;
    }
    return `${basePath}${readingPath}${url.search}`;
  }

  const segments = splitPathSegments(url.pathname, basePath);

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

  // No explicit `?lang=` — nothing deterministic to build here either;
  // `acceptLanguageRedirect` negotiates a language for this shape instead.
  const language = url.searchParams.get("lang");
  if (!language) {
    return null;
  }

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
 * Handles every reading-position URL with NO explicit language anywhere in
 * the request — no 4th path segment, no `?lang=` query param.
 * `legacyReadingUrlRedirect` never touches these (it only corrects requests
 * that already name a language); this one negotiates a language and always
 * returns a 302, since the result can depend on the visitor's
 * `Accept-Language` header. The caller is responsible for pairing it with a
 * `Vary: Accept-Language` response header.
 *
 * Also corrects the book segment (typo, alias, casing) in the same redirect
 * — there is no reason to make a visitor round-trip through two redirects
 * (one to fix the book, one to add the language) when both can be decided
 * from a single request.
 *
 * Two different resolution rules, depending on whether a translation was
 * named:
 * - Translation given (the 3-segment `{translationId}/{book}/{chapter}`
 *   path, or `?translation=`/`?translationId=` on a bare root): the
 *   language is the translation's own — read from the hardcoded
 *   per-language-default table when it's one of those (no network call
 *   needed), otherwise the visitor's preferred supported
 *   `Accept-Language`, otherwise English.
 * - No translation given (the legacy `/{book}/{chapter}` path, or a bare
 *   root with no `?translation=`): the language comes from
 *   `Accept-Language` first, and the translation is that language's own
 *   default; when nothing in `Accept-Language` is supported, both fall back
 *   to English/AAB.
 *
 * Only ever redirects a book that resolves (exactly or via the fuzzy
 * fallback) — an unresolved book has nothing confident to redirect to and
 * falls through to `render()`'s `notFound` handling instead.
 */
export function acceptLanguageRedirect(
  path: string,
  basePath: string,
  acceptedLanguages: string[]
): string | null {
  const url = new URL(path, "http://ssr.local");

  // An explicit language anywhere means `legacyReadingUrlRedirect` owns this
  // request instead.
  if (url.searchParams.get("lang")) {
    return null;
  }

  const parsed = parseReadingPath(url.pathname, basePath);

  let bookId: BookId | null;
  let chapter: number;
  let explicitTranslationId: string | null;

  if (parsed) {
    // A 4-segment path always has an explicit language segment — not this
    // function's job.
    if (parsed.language !== null) {
      return null;
    }
    bookId = parsed.bookId;
    chapter = parsed.chapter;
    explicitTranslationId = parsed.translationId;
  } else {
    const segments = splitPathSegments(url.pathname, basePath);

    if (segments.length === 2) {
      // The prior /{book}/{chapter} format: no translation named at all.
      const bookSegment = segments[0]!;
      const candidateBookId =
        getBookId(bookSegment) ?? findClosestBookId(bookSegment);
      const chapterValue = Number(segments[1]);
      if (
        candidateBookId &&
        Number.isFinite(chapterValue) &&
        chapterValue > 0
      ) {
        bookId = candidateBookId;
        chapter = Math.floor(chapterValue);
      } else {
        bookId = null;
        chapter = 1;
      }
      explicitTranslationId = null;
    } else if (segments.length === 0) {
      // Bare root — only a candidate if `?book=` says so.
      const bookParam = url.searchParams.get("book");
      if (!bookParam) {
        return null;
      }
      bookId = getBookId(bookParam) ?? findClosestBookId(bookParam);
      const chapterValue = Number(url.searchParams.get("chapter"));
      chapter =
        Number.isFinite(chapterValue) && chapterValue > 0
          ? Math.floor(chapterValue)
          : 1;
      explicitTranslationId =
        url.searchParams.get("translationId") ??
        url.searchParams.get("translation");
    } else {
      return null;
    }
  }

  if (!bookId) {
    return null;
  }

  let language: string;
  let translationId: string;
  if (explicitTranslationId) {
    translationId = explicitTranslationId;
    language =
      uiLocaleForDefaultTranslation(translationId) ??
      getPreferredSupportedLanguage(acceptedLanguages) ??
      DEFAULT_UI_LANGUAGE;
  } else {
    language =
      getPreferredSupportedLanguage(acceptedLanguages) ?? DEFAULT_UI_LANGUAGE;
    translationId = getDefaultTranslationForLanguage(language).id;
  }

  const readingPath = buildReadingPath({
    language,
    translationId,
    bookId,
    chapter,
  });

  if (parsed) {
    // 3-segment path: translation/book/chapter already live in the path, so
    // nothing to fold out of the query string.
    return `${basePath}${readingPath}${url.search}`;
  }

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
 * Verse content is part of that document, not filled in later: the reader
 * suspends the server render on the first chapter fetch (see `BibleReader`),
 * bounded by `SSR_INITIAL_CHAPTER_TIMEOUT_MS`. That suspension is what lets the
 * meta block below quote the chapter — remove it and every chapter page falls
 * back to a generic description.
 */
export async function render(
  options: RenderOptions
): Promise<
  | { html: string; notFound?: true }
  | { redirectTo: string; redirectStatus?: number; vary?: string }
  | string
> {
  const { config: injectedConfig } = options;

  const redirectTo = legacyReadingUrlRedirect(
    options.path,
    injectedConfig.basePath
  );
  if (redirectTo) {
    return { redirectTo };
  }

  const languageRedirectTo = acceptLanguageRedirect(
    options.path,
    injectedConfig.basePath,
    injectedConfig.acceptedLanguages
  );
  if (languageRedirectTo) {
    return {
      redirectTo: languageRedirectTo,
      redirectStatus: 302,
      vary: "Accept-Language",
    };
  }

  // Combine the injected config with the defaults
  // This allows the server to read the injected branding config and pass it to the app during SSR, while still providing defaults for any missing values.
  const config = {
    ...DEFAULT_APP_CONFIG,
    ...injectedConfig,
  };

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
      <meta property="og:locale" content={state.i18n.language.value} />
      <meta
        property="og:locale:alternate"
        content={state.i18n.defaultLanguage}
      />
      <meta property="og:title" content={state.app.socialTitle.value} />
      <meta property="og:description" content={state.app.description.value} />
      <meta property="og:url" content={state.app.canonicalUrl.value} />
      <meta property="og:site_name" content={state.app.siteName.value} />
      {/* `twitter:*` really is `name=`, unlike `og:*`. No `twitter:image`: it
          would fall back to `og:image`, which is root-relative in index.html
          and so unresolvable by most scrapers either way. */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={state.app.socialTitle.value} />
      <meta name="twitter:description" content={state.app.description.value} />
      <link rel="canonical" href={state.app.canonicalUrl.value} />
      <title>{state.app.title.value}</title>
    </>
  );

  const configJson = escapeForScript(JSON.stringify(config));
  // Snapshotted after the render above settles, so it includes every
  // response the render actually fetched (translations, book catalog,
  // chapter content) — that's what lets the client skip re-fetching them.
  const seedJson = escapeForScript(
    JSON.stringify(state.bibleData.api.snapshotResponseCache())
  );

  const substitutions: Array<[placeholder: string, value: string]> = [
    ["<!-- META -->", metaHtml], // No additional meta tags for now, but this allows it to be customized per request in the future if needed.
    ["<!-- CONFIG_JSON -->", configJson],
    ["<!-- SEED_JSON -->", seedJson],
    ["<!-- APP_HTML -->", appHtml],
  ];

  return {
    html: substitutions.reduce(
      (html, [placeholder, value]) =>
        replacePlaceholder(html, placeholder, value),
      options.html
    ),
    ...(notFound ? { notFound: true as const } : {}),
  };
}
