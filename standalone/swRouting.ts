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
