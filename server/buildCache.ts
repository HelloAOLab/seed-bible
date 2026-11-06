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
  /**
   * Recently failed loads, kept apart from `slots` so a broken build can't
   * push a working one out of the LRU.
   */
  private readonly failures = new Map<
    string,
    { promise: Promise<T>; until: number }
  >();

  /**
   * @param failureTtlMs How long a failed load is remembered, so a broken
   *   bundle isn't downloaded and given a fresh worker on every request.
   */
  constructor(
    private readonly max: number,
    private readonly failureTtlMs = 0
  ) {}

  get size(): number {
    return this.slots.size;
  }

  has(key: string): boolean {
    return this.slots.has(key);
  }

  /**
   * Returns the cached entry for `key`, or starts `load()` and caches it.
   * Concurrent misses for the same key share one load, so a cold build never
   * gets two workers. A failed load is answered from memory for
   * `failureTtlMs`, then retried by the next request.
   */
  get(
    key: string,
    load: () => Promise<T>
  ): { entry: Promise<T>; hit: boolean } {
    const failure = this.failures.get(key);
    if (failure) {
      if (failure.until > Date.now()) {
        return { entry: failure.promise, hit: true };
      }
      this.failures.delete(key);
    }

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
        // Only a build that actually loaded may push another out; a failing
        // one would otherwise cost a working build its worker. Never itself:
        // others may have been used since it started loading, but its own
        // request is about to.
        for (const other of [...this.slots.keys()]) {
          if (this.slots.size <= this.max) break;
          if (other !== key) this.delete(other);
        }
      },
      () => {
        if (this.slots.get(key) !== slot) return;
        this.slots.delete(key);
        if (this.failureTtlMs > 0) {
          const now = Date.now();
          // A failed build that's never asked for again would otherwise stay.
          for (const [k, f] of this.failures) {
            if (f.until <= now) this.failures.delete(k);
          }
          this.failures.set(key, { promise, until: now + this.failureTtlMs });
        }
      }
    );
    return { entry: promise, hit: false };
  }

  /**
   * Drops and retires the entry for `key` (once loaded, if still loading), and
   * forgets any remembered failure for it, so the next request tries afresh.
   */
  delete(key: string): void {
    this.failures.delete(key);
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
    for (const key of [...this.slots.keys(), ...this.failures.keys()]) {
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
