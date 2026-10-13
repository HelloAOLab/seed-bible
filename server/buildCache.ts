/**
 * LRU cache of loaded SSR builds. Unlike a plain Map, dropping an entry here
 * retires it, which is what actually releases a build's memory (see
 * `buildWorker.ts`).
 */

export interface Retirable {
  retire(): void;
}

interface Slot<T> {
  promise: Promise<T>;
  /** Set once `promise` resolves. */
  value?: T;
}

export class BuildCache<T extends Retirable> {
  private readonly slots = new Map<string, Slot<T>>(); // insertion-ordered → LRU

  constructor(private readonly max: number) {}

  get size(): number {
    return this.slots.size;
  }

  has(key: string): boolean {
    return this.slots.has(key);
  }

  /**
   * Returns the cached entry for `key`, or starts `load()` and caches it.
   * Concurrent misses for the same key share one load, so a cold build never
   * gets two workers. A failed load is not cached, so the next request
   * retries it.
   */
  get(
    key: string,
    load: () => Promise<T>
  ): { entry: Promise<T>; hit: boolean } {
    const existing = this.slots.get(key);
    if (existing) {
      // Refresh LRU recency.
      this.slots.delete(key);
      this.slots.set(key, existing);
      return { entry: existing.promise, hit: true };
    }

    const promise = load();
    const slot: Slot<T> = { promise };
    this.slots.set(key, slot);
    promise.then(
      (value) => {
        slot.value = value;
      },
      () => {
        if (this.slots.get(key) === slot) this.slots.delete(key);
      }
    );

    while (this.slots.size > this.max) {
      const oldest = this.slots.keys().next().value as string;
      this.delete(oldest);
    }
    return { entry: promise, hit: false };
  }

  /** Drops and retires the entry for `key` (once loaded, if still loading). */
  delete(key: string): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    this.slots.delete(key);
    slot.promise.then(
      (value) => value.retire(),
      () => {}
    );
  }

  /** Drops and retires every entry whose key matches. */
  deleteWhere(predicate: (key: string) => boolean): void {
    for (const key of [...this.slots.keys()]) {
      if (predicate(key)) this.delete(key);
    }
  }

  /**
   * Drops `key` without retiring it, but only if it still maps to `value` —
   * for an entry that has already stopped on its own (e.g. a crashed worker)
   * and must not shadow a fresh one loaded since.
   */
  forget(key: string, value: T): void {
    if (this.slots.get(key)?.value === value) this.slots.delete(key);
  }
}
