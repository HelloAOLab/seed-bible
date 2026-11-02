import type { ApiResponseCache } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  createSsrPromiseCache,
  positiveNumberFromEnv,
} from "./ssrPromiseCache";

/**
 * Chapter and book-catalog JSON is static per translation release, so a
 * short TTL is enough to absorb repeat renders and the rare slow upstream
 * fetch (renders otherwise wait up to the 5 s chapter deadline). Configurable
 * for ops without a redeploy.
 */
export const API_RESPONSE_TTL_MS = positiveNumberFromEnv(
  process.env.SSR_API_RESPONSE_CACHE_TTL_MS,
  10 * 60_000
);

export const API_RESPONSE_MAX_ENTRIES = positiveNumberFromEnv(
  process.env.SSR_API_RESPONSE_CACHE_MAX_ENTRIES,
  500
);

const cache = createSsrPromiseCache<unknown>({
  ttlMs: API_RESPONSE_TTL_MS,
  maxEntries: API_RESPONSE_MAX_ENTRIES,
});

/**
 * Shared across every `render()` in the server process. Responses are
 * handed out by reference to many renders, which is safe only because
 * nothing downstream mutates fetched chapter/book data in place.
 */
export const ssrApiResponseCache: ApiResponseCache = cache;

/** Test-only seam. */
export function resetSsrApiResponseCacheForTests(): void {
  cache.clear();
}
