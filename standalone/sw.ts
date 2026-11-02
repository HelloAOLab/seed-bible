/// <reference lib="webworker" />
/**
 * Seed Bible service worker.
 *
 * Built with vite-plugin-pwa's `injectManifest` strategy: this file is the
 * actual source, and the build replaces `self.__WB_MANIFEST` with the list of
 * precached (core) assets. See the `VitePWA(...)` block in `vite.config.ts`.
 *
 * The deployment shape this has to cope with (see the header comments in
 * `vite.config.ts` and `server/index.ts`):
 *
 *  - The page HTML is server-rendered per request. It is never a static file,
 *    so it can only ever be *runtime* cached, never precached.
 *  - Hashed chunks are NOT served from the site root. Every build publishes its
 *    own copy under `<assetRoot>branches/<branch>/<buildId>/assets/...`, so the
 *    precache manifest is rewritten at build time to those absolute URLs.
 *  - Only the root (`main`) build ships a service worker, but its scope is `/`,
 *    which also covers branch preview deployments mounted at `/b/<branch>/...`.
 *    Those are a *different* build with different assets, so this worker stays
 *    out of their way entirely.
 *
 * Caching strategy, in short:
 *
 *  | What                                   | Strategy                        |
 *  |----------------------------------------|---------------------------------|
 *  | Core assets (entry JS, vendor, CSS, …) | Precache (install time)         |
 *  | Page HTML (any non-`/b/` navigation)   | One entry per URL; see "The app shell" below |
 *  | Other assets of *this* build           | CacheFirst                      |
 *  | Google Fonts / Fontshare stylesheets   | StaleWhileRevalidate            |
 *  | Google Fonts / Fontshare font files    | CacheFirst                      |
 *  | Anything else (other branches, APIs)   | Not handled — straight to net   |
 */
import { clientsClaim } from "workbox-core";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { hasDownloadedTranslation } from "./swOffline";
import {
  blankAppContainer,
  chooseNavigationStrategy,
  getAppShellCacheKey,
  isAppShellNavigation,
  isCacheableStaticAsset,
  pickShellSource,
} from "./swRouting";

// `declare let` (rather than `const`) so this shadows the `self: WorkerGlobalScope`
// that lib.webworker declares, instead of colliding with it.
declare let self: ServiceWorkerGlobalScope & {
  /** Replaced at build time with this build's precache manifest. */
  __WB_MANIFEST: (PrecacheEntry | string)[];
};

/**
 * URL prefix this build's hashed chunks are served from, with a trailing slash
 * — e.g. `https://assets.seedbible.com/branches/main/<buildId>/`. Injected by
 * `define` in `vite.config.ts`; falls back to `/` for a plain local build.
 */
declare const __ASSET_BASE_URL__: string;

const DAY_SECONDS = 60 * 60 * 24;

/**
 * The `-v2` suffix is the cache's format version: v1 held a single shared
 * entry for every URL, which showed the wrong chapter. `activate` deletes
 * `LEGACY_HTML_CACHES` so that stale entry is never served again.
 */
const HTML_CACHE = "seed-bible-html-v2";
const LEGACY_HTML_CACHES = ["seed-bible-html"];
/** One entry per page URL; least-recently-used pages are evicted past this. */
const MAX_HTML_CACHE_ENTRIES = 60;
const ASSET_CACHE = "seed-bible-assets";
const FONT_STYLESHEET_CACHE = "seed-bible-font-stylesheets";
const FONT_FILE_CACHE = "seed-bible-font-files";

/** Absolute form of `__ASSET_BASE_URL__`, so it can be compared against request URLs. */
const ASSET_BASE_HREF = new URL(__ASSET_BASE_URL__, self.location.href).href;

/**
 * Origins the fonts come from. The stylesheet hosts are fetched as CSS; the
 * file hosts serve the actual woff2 files those stylesheets point at.
 */
const FONT_STYLESHEET_ORIGINS = [
  "https://fonts.googleapis.com",
  "https://api.fontshare.com",
];
const FONT_FILE_ORIGINS = [
  "https://fonts.gstatic.com",
  "https://cdn.fontshare.com",
];

// ─── Precache: this build's core assets ──────────────────────────────────────
// The manifest is generated from `injectManifest.globPatterns` in
// vite.config.ts (entry JS, vendor JS, CSS, images/fonts, the web manifest) and
// rewritten there to absolute asset-host URLs. Everything else the app loads
// lazily — extra language bundles, extension chunks — is left to the runtime
// asset route below, so installing the worker doesn't download the whole app.
//
// Registered first so precached URLs win over the broader runtime routes.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── The app shell (HTML) ────────────────────────────────────────────────────

/**
 * Each URL's HTML is cached under its own key (`getAppShellCacheKey`), so a
 * cache hit is the page that was asked for and the client can hydrate it
 * instead of redrawing a different chapter. How a load is answered depends on
 * `chooseNavigationStrategy` (see `swRouting.ts`):
 *
 *  - Downloaded a translation: cached page for this URL if present, else a
 *    content-free shell built from another cached page (the app fills it from
 *    its local data), with this URL fetched in the background for next time.
 *  - Otherwise: network first, so a first visit to a chapter gets real
 *    server-rendered HTML; the cache only covers being offline.
 */

/**
 * Fetches the shell once while installing, so the app survives being closed
 * offline after a *single* visit.
 *
 * Without this there is a gap: the page that registers the worker isn't yet
 * controlled by it, so its HTML never passes through the route below. The
 * precache would be full but the shell cache empty, and an offline launch would
 * still land on the browser's "no connection" page until the user had visited
 * a second time.
 *
 * Returns whether the shell was actually refreshed. Never throws — this is
 * called from an install handler, where a rejected `waitUntil` promise fails
 * the install outright, and a failed warm here is meant to be recoverable
 * (see the `install` listener below), not fatal.
 *
 * Warms from the URL of the page that's actually registering this worker
 * (falling back to `/` if that can't be determined), since that's the only
 * real content available to seed the shell with — but stores it under
 * `getAppShellCacheKey`'s key for that URL, like every other write to this
 * cache, not under its own URL. A registering page carrying a
 * `?customization=...` link warms that customization's own entry, not the
 * plain shell — consistent with the route below, which would do the same on
 * this page's first real navigation.
 */
async function warmAppShellCache(): Promise<boolean> {
  try {
    // `includeUncontrolled` is what makes this work on a *first* install: a
    // worker that is still installing controls nothing yet (control only
    // arrives at activate/`clientsClaim()`), so without it `matchAll` comes
    // back empty on exactly the visit this function exists for, and the
    // fallback to `/` leaves the page the user is actually reading uncached.
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    // Same-origin windows the worker doesn't control also include branch
    // previews under `/b/...`, which this worker deliberately stays out of
    // (see the route below). Warming one of those would cache a shell the
    // route will never serve *and* still miss the real page, so pick the
    // first client the shell route would actually answer for.
    const url =
      clients.find((client) =>
        isAppShellNavigation({
          url: new URL(client.url),
          requestMode: "navigate",
          origin: self.location.origin,
        })
      )?.url ?? "/";
    const response = await fetch(url, { cache: "no-cache" });
    // Same acceptance rule as the route's `CacheableResponsePlugin` below, so
    // this can't seed the cache with something the route would have rejected.
    if (response.status !== 200) return false;
    const cache = await caches.open(HTML_CACHE);
    // Copied before storing, to drop the `redirected` flag. This `fetch` is
    // built from a string, so it follows redirects — meaning a URL that ever
    // starts redirecting would land here as a perfectly ordinary 200 that is
    // also flagged `redirected`. Serving such a response to a navigation
    // (whose redirect mode is "manual") is a hard browser error, so caching
    // one would turn every offline launch into a failure instead of the
    // shell. Stored under the same key the route below would use, same as
    // every other write to this cache.
    const cacheKey = getAppShellCacheKey(
      self.location.origin,
      new URL(url, self.location.origin)
    );
    await cache.put(cacheKey, new Response(response.body, response));
    return true;
  } catch {
    // Offline (or otherwise unreachable) at install time.
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    warmAppShellCache().then((warmed) => {
      // Only cut over to this worker once its own shell is confirmed to
      // match the build that's installing right now. Precaching (via
      // `precacheAndRoute`/`cleanupOutdatedCaches` above) drops the
      // *previous* build's chunks the moment this worker activates,
      // regardless of connectivity — so activating with a stale shell still
      // cached would leave an offline load stranded between old HTML that
      // references chunks the precache no longer has. Skipping
      // `skipWaiting()` here instead leaves the *previous* worker in
      // control — its own shell and precache are still mutually consistent
      // — until a later install attempt (the browser's normal update
      // polling, while online) succeeds.
      if (warmed) self.skipWaiting();
    })
  );
});

/** Stores a 200 page under its own URL's key; anything else is ignored. */
async function cachePage(requestUrl: URL, response: Response): Promise<void> {
  // Never let a 404 (unknown branch) or 500 (render error) become the stored
  // copy of the app. Server redirects arrive as opaque (status 0) responses
  // for navigations, so they are rejected here too; the browser follows the
  // redirect itself and the destination's 200 is stored on its own fetch event.
  if (response.status !== 200) return;
  const cache = await caches.open(HTML_CACHE);
  const key = getAppShellCacheKey(self.location.origin, requestUrl);
  // Delete first so a refreshed page moves to the newest position in
  // `cache.keys()`, which is insertion-ordered and drives eviction below.
  await cache.delete(key);
  await cache.put(key, response);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .slice(0, Math.max(0, keys.length - MAX_HTML_CACHE_ENTRIES))
      .map((k) => cache.delete(k))
  );
}

async function fetchAndCachePage(request: Request): Promise<Response> {
  const response = await fetch(request);
  const copy = response.clone();
  await cachePage(new URL(request.url), copy).catch(() => {});
  return response;
}

async function buildBlankShell(requestUrl: URL): Promise<Response | null> {
  const cache = await caches.open(HTML_CACHE);
  const sourceKey = pickShellSource(
    requestUrl,
    (await cache.keys()).map((request) => request.url)
  );
  const source = sourceKey ? await cache.match(sourceKey) : undefined;
  if (!source) return null;
  const blank = blankAppContainer(await source.text());
  if (blank === null) return null;
  return new Response(blank, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleNavigation(event: FetchEvent): Promise<Response> {
  const { request } = event;
  const requestUrl = new URL(request.url);
  const cache = await caches.open(HTML_CACHE);
  const cached = await cache.match(
    getAppShellCacheKey(self.location.origin, requestUrl)
  );
  const downloaded = await hasDownloadedTranslation(self.indexedDB);

  // Computed lazily and only when it can change the decision.
  const shell =
    !cached && downloaded ? await buildBlankShell(requestUrl) : null;

  const strategy = chooseNavigationStrategy({
    hasCachedPage: !!cached,
    hasShellSource: !!shell,
    hasDownloadedTranslation: downloaded,
  });

  if (strategy === "cached-with-revalidate" && cached) {
    event.waitUntil(fetchAndCachePage(request).catch(() => {}));
    return cached;
  }
  if (strategy === "blank-shell" && shell) {
    event.waitUntil(fetchAndCachePage(request).catch(() => {}));
    return shell;
  }
  try {
    return await fetchAndCachePage(request);
  } catch (error) {
    // Offline and not a downloader: any copy of this page beats an error.
    if (cached) return cached;
    const fallback = await buildBlankShell(requestUrl);
    if (fallback) return fallback;
    throw error;
  }
}

registerRoute(
  ({ url, request }) =>
    isAppShellNavigation({
      url,
      requestMode: request.mode,
      origin: self.location.origin,
    }),
  ({ event }) => handleNavigation(event as FetchEvent)
);

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(LEGACY_HTML_CACHES.map((name) => caches.delete(name)))
  );
});

// ─── Static assets ───────────────────────────────────────────────────────────

registerRoute(
  ({ url }) =>
    isCacheableStaticAsset({
      url,
      origin: self.location.origin,
      assetBaseHref: ASSET_BASE_HREF,
    }),
  new CacheFirst({
    cacheName: ASSET_CACHE,
    plugins: [
      // Status 0 is an opaque response — what a no-CORS request (an `<img>`,
      // for instance) gets back from the asset host. It has to be allowed or
      // images loaded outside the precache would never be stored. The cost is
      // that a cross-origin error page is indistinguishable from a real one and
      // could be cached; asset URLs are content-hashed and immutable, so that
      // only happens on a broken deploy, and the expiry below clears it out.
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      // Asset URLs are unique per build, so entries from older builds are dead
      // weight the moment a new build ships — nothing will ever request them
      // again. They are not deleted on activation (a page from the old build
      // may still be open and need them); they age out instead.
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * DAY_SECONDS,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ─── Web fonts ───────────────────────────────────────────────────────────────
// The app's fonts (DM Sans, Newsreader, Plus Jakarta Sans, Material Symbols,
// Satoshi) are loaded from Google Fonts and Fontshare, so they aren't in the
// build output and can't be precached — the stylesheet has to be fetched before
// the font file URLs inside it are even known. Runtime caching gets them
// offline from the second visit onwards.

registerRoute(
  ({ url }) => FONT_STYLESHEET_ORIGINS.includes(url.origin),
  new StaleWhileRevalidate({
    cacheName: FONT_STYLESHEET_CACHE,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

registerRoute(
  ({ url }) => FONT_FILE_ORIGINS.includes(url.origin),
  new CacheFirst({
    cacheName: FONT_FILE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 365 * DAY_SECONDS,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ─── Lifecycle ───────────────────────────────────────────────────────────────
// `registerType: "autoUpdate"` in vite.config.ts means there is no "reload to
// update" prompt, so a new worker has to take over on its own — `skipWaiting()`
// is called from the `install` listener above (conditionally, once the shell
// is confirmed warm) rather than unconditionally here. `clientsClaim()` stays
// unconditional: it only has an effect once activation actually happens,
// however that was triggered, and just claims the open pages at that point.
clientsClaim();
