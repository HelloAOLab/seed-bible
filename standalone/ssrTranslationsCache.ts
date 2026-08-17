import type { TranslationsCache } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

/**
 * How long a fetched translations list is trusted before the SSR host
 * fetches it again. The translations endpoint changes rarely — each entry
 * carries a `sha256` of its own content, implying updates on a release
 * cadence rather than minute to minute — so a coarse TTL cuts request
 * volume drastically without meaningfully risking staleness. Configurable
 * for ops without a redeploy, same idiom as `POINTER_TTL_MS` in
 * `server/index.ts`.
 */
const TTL_MS = Number(process.env.SSR_TRANSLATIONS_CACHE_TTL_MS ?? 60 * 60_000); // 1 hour

interface Entry {
  promise: Promise<Translation[]>;
  expires: number;
}

/**
 * Module-level singleton: Node loads this module once per SSR server
 * process and every `render()` call reuses it, so this is what lets one
 * fetch be shared across many HTTP requests. In dev, Vite reloads the SSR
 * module per request, so the cache provides no benefit there — the same
 * trade-off this file's sibling caches (`pointerCache`, `moduleCache` in
 * `server/index.ts`) already make.
 */
const cache = new Map<string, Entry>();

export const ssrTranslationsCache: TranslationsCache = {
  get(endpoint) {
    const entry = cache.get(endpoint);
    if (!entry) {
      return undefined;
    }
    if (entry.expires <= Date.now()) {
      cache.delete(endpoint);
      return undefined;
    }
    return entry.promise;
  },
  set(endpoint, promise) {
    cache.set(endpoint, { promise, expires: Date.now() + TTL_MS });
  },
  delete(endpoint) {
    cache.delete(endpoint);
  },
};

/** Test-only seam: clears all entries so tests don't leak cache state into each other. */
export function resetSsrTranslationsCacheForTests(): void {
  cache.clear();
}
