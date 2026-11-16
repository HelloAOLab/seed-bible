import type { TranslationsCache } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

import {
  createSsrPromiseCache,
  positiveNumberFromEnv,
} from "./ssrPromiseCache";

/**
 * How long a fetched translations list is trusted before the SSR host
 * fetches it again. The translations endpoint changes rarely — each entry
 * carries a `sha256` of its own content, implying updates on a release
 * cadence rather than minute to minute — so a coarse TTL cuts request
 * volume drastically without meaningfully risking staleness. Configurable
 * for ops without a redeploy, same idiom as `POINTER_TTL_MS` in
 * `server/index.ts`.
 */
export const TTL_MS = positiveNumberFromEnv(
  process.env.SSR_TRANSLATIONS_CACHE_TTL_MS,
  60 * 60_000
);

/**
 * Module-level singleton: Node loads this module once per SSR server
 * process and every `render()` call reuses it, so this is what lets one
 * fetch be shared across many HTTP requests. In dev, Vite reloads the SSR
 * module per request, so the cache provides no benefit there — the same
 * trade-off this file's sibling caches (`pointerCache`, `moduleCache` in
 * `server/index.ts`) already make.
 */
const cache = createSsrPromiseCache<Translation[]>({
  ttlMs: TTL_MS,
  maxEntries: 100,
});

/**
 * Every caller sharing a cache hit receives the exact same `Translation[]`
 * instance (and the same element objects within it), across concurrent
 * requests and even different render()s. That's safe only because nothing
 * downstream mutates a `Translation` in place — `mergeTranslations` in
 * `BibleDataManager.tsx` only reads from it. If that ever changes, this
 * cache would need to hand out a defensive copy instead.
 */
export const ssrTranslationsCache: TranslationsCache = cache;

/** Test-only seam: clears all entries so tests don't leak cache state into each other. */
export function resetSsrTranslationsCacheForTests(): void {
  cache.clear();
}
