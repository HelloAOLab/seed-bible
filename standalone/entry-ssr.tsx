import { renderToStringAsync } from "preact-render-to-string";
import { Main } from "../packages/seed-bible/seed-bible/app/main";
import type { AppConfig } from "../packages/seed-bible/seed-bible/app/appConfig";
import { createSeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  getBookId,
  type BookId,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { getDefaultTranslationForLanguage } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  DEFAULT_UI_LANGUAGE,
  buildReadingPath,
  parseReadingPath,
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
 * Detects an obsolete URL shape and computes the equivalent canonical
 * `[/{lang}]/{translationId}/{bookSlug}/{chapter}` path to 301 to. Two
 * shapes are recognized: a bare root with legacy `?book=`/`?chapter=` (and
 * optionally `?translation=`/`?translationId=`/`?lang=`) query params, and
 * the prior `/{book}/{chapter}` path format (no translation/language).
 * Returns null when the request is already a canonical reading path (per
 * `parseReadingPath`) or doesn't match either legacy shape — falling
 * through to a normal render, which shows the app's own default/not-found
 * handling for an unrecognized book.
 */
function legacyReadingUrlRedirect(
  path: string,
  basePath: string
): string | null {
  const url = new URL(path, "http://ssr.local");

  if (parseReadingPath(url.pathname, basePath)) {
    return null;
  }

  const strippedPathname =
    basePath.length > 0 && url.pathname.startsWith(basePath)
      ? url.pathname.slice(basePath.length)
      : url.pathname;
  const segments = strippedPathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  let bookId: BookId | null = null;
  let chapter = 1;

  if (segments.length === 2) {
    // The immediately-prior /{book}/{chapter} format.
    const candidateBookId = getBookId(segments[0]!);
    const chapterValue = Number(segments[1]);
    if (candidateBookId && Number.isFinite(chapterValue) && chapterValue > 0) {
      bookId = candidateBookId;
      chapter = Math.floor(chapterValue);
    }
  } else if (segments.length === 0) {
    // Bare root — only a legacy redirect target if `?book=` says so.
    const bookParam = url.searchParams.get("book");
    if (bookParam) {
      bookId = getBookId(bookParam);
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
 * Server-side renders the app to a complete HTML document.
 *
 * The app shell (chrome, theme, head) renders on the server; verse content
 * is fetched and filled in by the client after hydration — standard for a
 * data-driven SPA that does not block first paint on network fetches.
 */
export async function render(
  options: RenderOptions
): Promise<{ html: string } | { redirectTo: string }> {
  const { config } = options;

  const redirectTo = legacyReadingUrlRedirect(options.path, config.basePath);
  if (redirectTo) {
    return { redirectTo };
  }

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
  };
}
