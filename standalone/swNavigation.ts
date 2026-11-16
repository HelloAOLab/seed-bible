/**
 * How the service worker answers a page load, kept free of worker globals
 * (everything it touches is passed in) so the offline fallbacks, cache limit
 * and timeout behavior can be unit tested — see
 * `test/unit/standalone/swNavigation.test.ts`.
 */
import {
  blankAppContainer,
  chooseNavigationStrategy,
  getAppShellCacheKey,
  pickShellSource,
  translationIdFromPath,
} from "./swRouting";

/**
 * How long a page load waits on the network before falling back to this URL's
 * saved copy. Same idea as Workbox NetworkFirst's `networkTimeoutSeconds`.
 */
export const NETWORK_TIMEOUT_MS = 3500;

/** Most pages kept; the least recently saved are evicted first. */
export const MAX_HTML_CACHE_ENTRIES = 60;

export interface HtmlPageStore {
  /** Saves a 200 page under its own URL; any other response is ignored. */
  put(requestUrl: URL, response: Response): Promise<void>;
  /** The saved copy of exactly this URL, if any. */
  match(requestUrl: URL): Promise<Response | undefined>;
  /** A content-free shell built from a saved page, or null if none can be. */
  blankShell(requestUrl: URL): Promise<Response | null>;
}

export function createHtmlPageStore(options: {
  caches: CacheStorage;
  cacheName: string;
  origin: string;
  maxEntries?: number;
}): HtmlPageStore {
  const {
    caches,
    cacheName,
    origin,
    maxEntries = MAX_HTML_CACHE_ENTRIES,
  } = options;

  // Writes run one at a time: two overlapping writes would each count the
  // entries before the other's landed and could both evict, or both skip it.
  let writes: Promise<unknown> = Promise.resolve();

  async function write(requestUrl: URL, response: Response): Promise<void> {
    const cache = await caches.open(cacheName);
    const key = getAppShellCacheKey(origin, requestUrl);
    // Delete first so a refreshed page moves to the newest position in
    // `cache.keys()`, which is insertion-ordered and drives eviction below.
    await cache.delete(key);
    await cache.put(key, response);
    const keys = await cache.keys();
    await Promise.all(
      keys
        .slice(0, Math.max(0, keys.length - maxEntries))
        .map((k) => cache.delete(k))
    );
  }

  return {
    put(requestUrl, response) {
      // Never let a 404 (unknown branch) or 500 (render error) become the
      // stored copy of the app. A server redirect reaches a navigation as an
      // opaque response (status 0), rejected here too; the browser follows it
      // and the destination's 200 is stored on its own fetch event.
      if (response.status !== 200) return Promise.resolve();
      const run = writes.then(() => write(requestUrl, response));
      writes = run.catch(() => {});
      return run;
    },
    async match(requestUrl) {
      const cache = await caches.open(cacheName);
      return cache.match(getAppShellCacheKey(origin, requestUrl));
    },
    async blankShell(requestUrl) {
      const cache = await caches.open(cacheName);
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
    },
  };
}

export interface NavigationDeps {
  store: HtmlPageStore;
  fetch: (request: Request) => Promise<Response>;
  /** Whether the translation (null: any) is downloaded on this device. */
  hasDownloadedTranslation: (translationId: string | null) => Promise<boolean>;
  /** Keeps the worker alive until background work finishes. */
  waitUntil: (promise: Promise<unknown>) => void;
  networkTimeoutMs?: number;
}

/**
 * Answers one page load. The network request starts immediately, alongside
 * the cache and IndexedDB lookups, so none of them delay it.
 */
export async function handleNavigation(
  request: Request,
  deps: NavigationDeps
): Promise<Response> {
  const { store } = deps;
  const requestUrl = new URL(request.url);

  const network = deps.fetch(request);
  // Saving and refreshing happen whether or not the response is the one used.
  deps.waitUntil(
    network.then(
      (response) => store.put(requestUrl, response.clone()),
      () => undefined
    )
  );
  // Nothing may stay unhandled when we answer from the cache instead.
  network.catch(() => undefined);

  const [cached, downloaded] = await Promise.all([
    store.match(requestUrl),
    deps.hasDownloadedTranslation(translationIdFromPath(requestUrl.pathname)),
  ]);
  const shell =
    !cached && downloaded ? await store.blankShell(requestUrl) : null;

  const strategy = chooseNavigationStrategy({
    hasCachedPage: !!cached,
    hasShellSource: !!shell,
    hasDownloadedTranslation: downloaded,
  });
  if (strategy === "cached-with-revalidate" && cached) return cached;
  if (strategy === "blank-shell" && shell) return shell;

  // Network first. A saved copy of this very URL beats a stalled connection,
  // and beats an error when offline.
  if (!cached) {
    try {
      return await network;
    } catch (error) {
      const fallback = await store.blankShell(requestUrl);
      if (fallback) return fallback;
      throw error;
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timeout">((resolve) => {
    timer = setTimeout(
      () => resolve("timeout"),
      deps.networkTimeoutMs ?? NETWORK_TIMEOUT_MS
    );
  });
  try {
    const winner = await Promise.race([network, timedOut]);
    return winner === "timeout" ? cached : winner;
  } catch {
    return cached;
  } finally {
    clearTimeout(timer);
  }
}
