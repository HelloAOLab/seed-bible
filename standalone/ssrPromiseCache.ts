export interface SsrPromiseCache<V> {
  get(key: string): Promise<V> | undefined;
  set(key: string, promise: Promise<V>): void;
  delete(key: string): void;
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
 * A TTL'd, size-bounded cache of promises. Storing the promise (not the
 * resolved value) is what lets concurrent callers share one in-flight
 * request. Callers are responsible for `delete`-ing a promise that rejects
 * so a failure is never served from cache.
 *
 * When full, the oldest-inserted entry is evicted (Map iteration order);
 * re-`set`ting a key moves it to the newest position.
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
