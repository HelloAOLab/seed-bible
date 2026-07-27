import { renderToStringAsync } from "preact-render-to-string";
import { Main } from "../packages/seed-bible/seed-bible/app/main";
import type { AppConfig } from "../packages/seed-bible/seed-bible/app/appConfig";
import { createSeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  getBookId,
  getBookSlug,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";

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
 * Detects a legacy `?book=GEN&chapter=1` request at the app root and
 * computes the equivalent clean path (e.g. "/genesis/1") to 301 to, dropping
 * `book`/`chapter` and preserving every other query param. Returns null when
 * the request isn't a legacy URL (no redirect needed) or the book isn't
 * recognized (falls through to the normal render, which shows the app's own
 * default/not-found handling).
 */
function legacyQueryParamRedirect(
  path: string,
  basePath: string
): string | null {
  const url = new URL(path, "http://ssr.local");
  const pathname =
    basePath.length > 0 && url.pathname.startsWith(basePath)
      ? url.pathname.slice(basePath.length)
      : url.pathname;

  if (pathname !== "" && pathname !== "/") {
    return null;
  }

  const bookParam = url.searchParams.get("book");
  if (!bookParam) {
    return null;
  }

  const bookId = getBookId(bookParam);
  if (!bookId) {
    return null;
  }

  const chapterParam = Number(url.searchParams.get("chapter"));
  const chapter =
    Number.isFinite(chapterParam) && chapterParam > 0
      ? Math.floor(chapterParam)
      : 1;

  const remainingParams = new URLSearchParams(url.search);
  remainingParams.delete("book");
  remainingParams.delete("chapter");
  const query = remainingParams.toString();

  return `${basePath}/${getBookSlug(bookId)}/${chapter}${query ? `?${query}` : ""}`;
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

  const redirectTo = legacyQueryParamRedirect(options.path, config.basePath);
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
