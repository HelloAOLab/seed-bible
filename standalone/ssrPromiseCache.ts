import type { PromiseCache } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

export interface SsrPromiseCache<V> extends PromiseCache<V> {
  /** Test-only seam: drops every entry. */
  clear(): void;
}

/**
 * Parses a positive, finite number from an env var, else returns the
 * fallback. An empty string (`Number("")` is 0, expiring every entry
 * instantly) or a non-numeric value (`NaN`, never expiring) must not leak
 * through as a "valid" TTL or size.
 */
export function positiveNumberFromEnv(
  raw: string | undefined,
  fallback: number
): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Like `positiveNumberFromEnv`, but for a count: fractions are floored and
 * anything below 1 falls back (a fractional bound like 0.5 would otherwise
 * evict every entry right after inserting it).
 */
export function positiveIntegerFromEnv(
  raw: string | undefined,
  fallback: number
): number {
  const parsed = Math.floor(Number(raw));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

/**
 * A TTL'd, size-bounded cache of promises. Storing the promise (not the
 * resolved value) is what lets concurrent callers share one in-flight
 * request. Callers are responsible for `delete`-ing a promise that rejects
 * so a failure is never served from cache.
 *
 * When full, the least recently used entry is evicted: a hit moves the key
 * to the newest position (Map iteration order), as does re-`set`ting it. A
 * hit does not extend the TTL, which is measured from insertion, so a hot
 * chapter is still refreshed periodically.
 */
export function createSsrPromiseCache<V>(options: {
  ttlMs: number;
  maxEntries: number;
}): SsrPromiseCache<V> {
  const entries = new Map<string, { promise: Promise<V>; expires: number }>();
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) {
        return undefined;
      }
      if (entry.expires <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key);
      entries.set(key, entry);
      return entry.promise;
    },
    set(key, promise) {
      entries.delete(key);
      entries.set(key, { promise, expires: Date.now() + options.ttlMs });
      while (entries.size > options.maxEntries) {
        const oldest = entries.keys().next().value as string;
        entries.delete(oldest);
      }
    },
    delete(key) {
      entries.delete(key);
    },
    clear() {
      entries.clear();
    },
  };
}
