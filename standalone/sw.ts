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
 *  | Page HTML (any non-`/b/` navigation)   | NetworkFirst, 3s timeout        |
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
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { isAppShellNavigation, isCacheableStaticAsset } from "./swRouting";

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

const HTML_CACHE = "seed-bible-html";
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
 * Each navigation's HTML is cached under its own URL — Workbox's default key
 * (the full request URL, including query string) — since no
 * `cacheKeyWillBeUsed` override is registered on the route below. This
 * matters because the client now calls Preact's `hydrate()`, not `render()`
 * (see `app/init.tsx`): hydration requires the container's existing DOM to
 * already match the URL being hydrated. Serving a cached copy from a
 * *different* URL/book/chapter would hydrate against the wrong content, and
 * — unlike a full render/rebuild — `hydrate()` does not diff attributes on
 * existing DOM, so a mismatch here would not self-correct.
 *
 * A URL with no cached copy falls through to the network (subject to the 3s
 * timeout below); if that also fails, the navigation gets no cached shell at
 * all rather than a mismatched one — the client-side hydration gate (see
 * `app/hydrationGate.ts`) decides whether to hydrate or fall back to a full
 * `render()` for whatever HTML is actually present, so an absent or stale
 * cache entry degrades to a normal client render rather than a broken
 * hydrate.
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
 * Deliberately swallows failures. Anything thrown out of an install handler
 * fails the install, and this is an optimisation, not a requirement — if the
 * host is unreachable right now, the first controlled navigation fills the
 * cache instead.
 *
 * Warms the URL of the page that's actually registering this worker (falling
 * back to `/` if that can't be determined) rather than always warming `/`:
 * now that each URL is cached separately, warming only `/` would leave a
 * user who installs the worker while reading `/AAB/genesis/10` with nothing
 * cached for that page specifically.
 */
async function warmAppShellCache(): Promise<void> {
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
    if (response.status !== 200) return;
    const cache = await caches.open(HTML_CACHE);
    // Copied before storing, to drop the `redirected` flag. This `fetch` is
    // built from a string, so it follows redirects — meaning a URL that ever
    // starts redirecting would land here as a perfectly ordinary 200 that is
    // also flagged `redirected`. Serving such a response to a navigation
    // (whose redirect mode is "manual") is a hard browser error, so caching
    // one would turn every offline launch into a failure instead of the
    // shell. Cached under the response's own (post-redirect) URL, matching
    // how the route below keys every other entry.
    await cache.put(response.url, new Response(response.body, response));
  } catch {
    // Offline at install time — nothing to do.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(warmAppShellCache());
});

registerRoute(
  ({ url, request }) =>
    isAppShellNavigation({
      url,
      requestMode: request.mode,
      origin: self.location.origin,
    }),
  new NetworkFirst({
    cacheName: HTML_CACHE,
    // Offline, `fetch` rejects immediately and we fall back to the cache right
    // away. This timeout is for the other case — a connection that is present
    // but not actually working — where waiting on the network would otherwise
    // hang the launch. Three seconds, then serve the last copy we saw.
    networkTimeoutSeconds: 3,
    plugins: [
      // Never let a 404 (unknown branch) or 500 (render error) become the
      // stored copy of the app.
      //
      // This is also what makes the server's redirects harmless here. A
      // navigation request carries `redirect: "manual"`, and Workbox passes
      // navigations through to `fetch` untouched, so the 301/302 the host
      // serves for a legacy or non-canonical reading URL arrives as an
      // opaque redirect — status 0, which this rejects. The browser then
      // follows the redirect itself and we see a fresh fetch event for the
      // destination, whose 200 is what gets stored.
      new CacheableResponsePlugin({ statuses: [200] }),
      // Every reading position gets its own entry now (see the comment
      // above), so — unlike the single shared entry this replaced — this
      // cache can grow without bound as a visitor reads more chapters.
      // Bounded the same way `ASSET_CACHE` below is; shorter-lived, since
      // this is an offline fallback behind a 3s NetworkFirst timeout, not
      // the primary path.
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 3 * DAY_SECONDS,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

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
// update" prompt, so a new worker has to take over on its own: skip the waiting
// phase, then claim the open pages.
self.skipWaiting();
clientsClaim();
