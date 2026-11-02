/**
 * The service worker's routing decisions: which requests it answers from the app
 * shell, and which files it is allowed to cache.
 *
 * Kept out of `sw.ts` and free of worker globals so it can be unit tested — see
 * `test/unit/standalone/swRouting.test.ts`. A mistake in either predicate is the
 * kind that ships quietly: too narrow and the app doesn't open offline, too wide
 * and a branch preview boots from the root build's cached shell.
 */

/**
 * Extensions that identify a request for a *file* rather than an app route.
 * Mirrors `ASSET_PATH_RE` in `server/index.ts` (which decides what the host
 * reverse-proxies to the asset host) minus `.map`, since there is no reason to
 * spend cache space on source maps.
 */
export const STATIC_FILE_RE =
  /\.(js|mjs|cjs|css|wasm|json|webmanifest|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|txt|xml)$/i;

export interface AppShellNavigationInput {
  /** The requested URL. */
  url: URL;
  /** The request's `mode`; only `"navigate"` is a page load. */
  requestMode: string;
  /** The worker's own origin, i.e. `self.location.origin`. */
  origin: string;
}

/**
 * True for navigations this worker should answer with the app shell: anything
 * on this origin that isn't a branch preview and isn't a file request.
 *
 * `/b/<branch>/<buildId>` deployments are deliberately excluded. They are a
 * different build of the app with their own assets, and this worker only knows
 * about the root build — answering them from the root shell would boot the
 * wrong version.
 */
export function isAppShellNavigation(input: AppShellNavigationInput): boolean {
  const { url, requestMode, origin } = input;
  if (requestMode !== "navigate") return false;
  if (url.origin !== origin) return false;
  if (url.pathname.startsWith("/b/")) return false;
  // Anything that looks like a file is somebody else's route.
  if (STATIC_FILE_RE.test(url.pathname)) return false;
  return true;
}

/**
 * Query param a customization share link is carried under — see
 * `CustomizationsManager.getShareLink`/`loadByLocator`. A customization's
 * branded HTML (theme, favicon) must never be used to stand in for a plain
 * page, or for another customization's, so it partitions shell sources below.
 */
export const CUSTOMIZATION_QUERY_PARAM = "customization";

/**
 * Cache key a navigation's HTML is stored/read under: the page's own URL
 * (origin, path and query, no fragment), so each chapter's HTML is cached
 * separately and a cache hit is always the page that was asked for — which is
 * what lets the client `hydrate()` instead of redrawing a different chapter.
 *
 * This used to be a single shared `/__app-shell` key, which meant nearly every
 * cached load showed the wrong chapter first (`url-mismatch` in
 * `app/hydrationGate.ts`).
 */
export function getAppShellCacheKey(origin: string, requestUrl: URL): string {
  return `${origin}${requestUrl.pathname}${requestUrl.search}`;
}

function customizationOf(href: string): string | null {
  return new URL(href).searchParams.get(CUSTOMIZATION_QUERY_PARAM);
}

/**
 * Picks which cached page to strip down into a content-free shell for a
 * request that has no cached HTML of its own. Only a page with the same
 * customization locator (or, for a plain request, none) qualifies, so one
 * customization's branding can't appear on another page.
 */
export function pickShellSource(
  requestUrl: URL,
  cachedKeys: readonly string[]
): string | undefined {
  const wanted = requestUrl.searchParams.get(CUSTOMIZATION_QUERY_PARAM);
  return cachedKeys.find((key) => customizationOf(key) === wanted);
}

export type NavigationStrategy =
  /** Ask the network first; use cache (then blank shell) only if offline. */
  | "network-first"
  /** Answer from this URL's cached HTML now, refresh it in the background. */
  | "cached-with-revalidate"
  /** Answer with a content-free shell now, fetch this URL's HTML in the background. */
  | "blank-shell";

export interface NavigationStrategyInput {
  /** Whether this exact URL's HTML is already cached. */
  hasCachedPage: boolean;
  /** Whether any HTML is cached that a blank shell could be built from. */
  hasShellSource: boolean;
  /** Whether the user has a translation downloaded for offline reading. */
  hasDownloadedTranslation: boolean;
}

/**
 * How to answer a page load.
 *
 * Someone with a downloaded translation can read without the HTML request at
 * all, so they keep the instant, network-free load: the cached page for this
 * URL if there is one, otherwise an empty shell that the app fills in from its
 * local data (never another chapter's content). Everyone else has no offline
 * data to fall back on, so a cache miss goes to the network and gets a
 * properly server-rendered page.
 */
export function chooseNavigationStrategy(
  input: NavigationStrategyInput
): NavigationStrategy {
  if (input.hasCachedPage && input.hasDownloadedTranslation) {
    return "cached-with-revalidate";
  }
  if (input.hasDownloadedTranslation && input.hasShellSource) {
    return "blank-shell";
  }
  return "network-first";
}

const APP_CONTAINER_OPEN_RE = /<div\s+id="app"\s*>/;
const DIV_TAG_RE = /<(\/?)div\b/g;

/**
 * Returns the page HTML with everything inside `<div id="app">` removed, so
 * the client sees no server-rendered content and does a clean `render()`
 * (`no-ssr-content` in `app/hydrationGate.ts`) rather than painting another
 * chapter's text first. Null when the container can't be found.
 */
export function blankAppContainer(html: string): string | null {
  const open = APP_CONTAINER_OPEN_RE.exec(html);
  if (!open) return null;
  const contentStart = open.index + open[0].length;
  DIV_TAG_RE.lastIndex = contentStart;
  let depth = 1;
  for (let m = DIV_TAG_RE.exec(html); m; m = DIV_TAG_RE.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) {
      return `${html.slice(0, contentStart)}<!-- APP_HTML -->${html.slice(m.index)}`;
    }
  }
  return null;
}

export interface CacheableStaticAssetInput {
  /** The requested URL. */
  url: URL;
  /** The worker's own origin, i.e. `self.location.origin`. */
  origin: string;
  /**
   * Absolute prefix this build's hashed chunks are served from, with a trailing
   * slash — e.g. `https://assets.example/branches/main/<buildId>/`.
   */
  assetBaseHref: string;
}

/**
 * True for a file request this worker is allowed to cache.
 *
 * The rule that matters: only files belonging to *this* deployment. Every build
 * publishes its assets under its own `branches/<branch>/<buildId>/` prefix, so
 * requiring the URL to start with this build's own prefix is what keeps another
 * branch's assets out of the cache — a branch preview opened at
 * `/b/<branch>/<buildId>` loads its chunks from a different prefix and simply
 * doesn't match here, so those requests go straight to the network.
 *
 * The second clause covers the handful of files that live at the site root
 * rather than under a build prefix (`manifest.webmanifest`, `registerSW.js`),
 * and any same-origin asset in a local build with no asset host configured.
 */
export function isCacheableStaticAsset(
  input: CacheableStaticAssetInput
): boolean {
  const { url, origin, assetBaseHref } = input;
  if (!STATIC_FILE_RE.test(url.pathname)) return false;
  if (url.href.startsWith(assetBaseHref)) return true;
  if (url.origin !== origin) return false;
  return (
    !url.pathname.startsWith("/b/") && !url.pathname.startsWith("/branches/")
  );
}
