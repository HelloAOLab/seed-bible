import { BuildCache } from "../../../server/buildCache";

class FakeBuild {
  retired = false;
  constructor(readonly name: string) {}
  retire() {
    this.retired = true;
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("BuildCache", () => {
  it("shares one load between concurrent misses for the same build", async () => {
    const cache = new BuildCache<FakeBuild>(4);
    let loads = 0;
    const load = async () => {
      loads++;
      return new FakeBuild("a");
    };

    const first = cache.get("main@a", load);
    const second = cache.get("main@a", load);

    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
    expect(await second.entry).toBe(await first.entry);
    expect(loads).toBe(1);
  });

  it("retires the least recently used build once over capacity", async () => {
    const cache = new BuildCache<FakeBuild>(2);
    const a = await cache.get("main@a", async () => new FakeBuild("a")).entry;
    const b = await cache.get("main@b", async () => new FakeBuild("b")).entry;
    // Touch `a` so `b` becomes the least recently used.
    cache.get("main@a", async () => new FakeBuild("unused"));

    const c = await cache.get("main@c", async () => new FakeBuild("c")).entry;
    await flush();

    expect(b.retired).toBe(true);
    expect(a.retired).toBe(false);
    expect(c.retired).toBe(false);
    expect(cache.has("main@b")).toBe(false);
    expect(cache.size).toBe(2);
  });

  it("retires a build evicted while still loading once it finishes loading", async () => {
    const cache = new BuildCache<FakeBuild>(1);
    const slow = deferred<FakeBuild>();
    cache.get("main@a", () => slow.promise);
    cache.get("main@b", async () => new FakeBuild("b"));

    const a = new FakeBuild("a");
    slow.resolve(a);
    await flush();

    expect(a.retired).toBe(true);
  });

  it("never evicts the build that just loaded, even if others were used since it started", async () => {
    const cache = new BuildCache<FakeBuild>(1);
    const a = await cache.get("main@a", async () => new FakeBuild("a")).entry;
    const slow = deferred<FakeBuild>();
    cache.get("main@b", () => slow.promise);
    // `a` is used again while `b` is still loading, so `b` is now the oldest.
    cache.get("main@a", async () => new FakeBuild("unused"));

    const b = new FakeBuild("b");
    slow.resolve(b);
    await flush();

    expect(b.retired).toBe(false);
    expect(cache.has("main@b")).toBe(true);
    expect(a.retired).toBe(true);
  });

  it("does not cache a failed load, so the next request retries it", async () => {
    const cache = new BuildCache<FakeBuild>(4);
    const failed = cache.get("main@a", () =>
      Promise.reject(new Error("S3 down"))
    );
    await expect(failed.entry).rejects.toThrow("S3 down");
    await flush();

    const retried = cache.get("main@a", async () => new FakeBuild("a"));

    expect(retried.hit).toBe(false);
    expect((await retried.entry).name).toBe("a");
  });

  describe("with a failure TTL", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const failingLoad = () => {
      let attempts = 0;
      const load = async (): Promise<FakeBuild> => {
        attempts++;
        throw new Error("bad bundle");
      };
      return { load, attempts: () => attempts };
    };

    it("answers a failed build from memory until the TTL passes, then retries it", async () => {
      const cache = new BuildCache<FakeBuild>(4, 30_000);
      const broken = failingLoad();

      await expect(cache.get("main@bad", broken.load).entry).rejects.toThrow(
        "bad bundle"
      );
      vi.advanceTimersByTime(29_000);
      const remembered = cache.get("main@bad", broken.load);
      await expect(remembered.entry).rejects.toThrow("bad bundle");
      expect(broken.attempts()).toBe(1);

      vi.advanceTimersByTime(1_000);
      await expect(cache.get("main@bad", broken.load).entry).rejects.toThrow(
        "bad bundle"
      );
      expect(broken.attempts()).toBe(2);
    });

    it("tries a failed build afresh once its branch is invalidated", async () => {
      const cache = new BuildCache<FakeBuild>(4, 30_000);
      const broken = failingLoad();
      await expect(cache.get("main@bad", broken.load).entry).rejects.toThrow();

      cache.deleteWhere((key) => key.startsWith("main@"));
      const fixed = await cache.get("main@bad", async () => new FakeBuild("ok"))
        .entry;

      expect(fixed.name).toBe("ok");
    });

    it("doesn't let a failed build push a working one out", async () => {
      const cache = new BuildCache<FakeBuild>(1, 30_000);
      const working = await cache.get(
        "main@good",
        async () => new FakeBuild("g")
      ).entry;

      await expect(
        cache.get("main@bad", failingLoad().load).entry
      ).rejects.toThrow();

      expect(working.retired).toBe(false);
      expect(cache.has("main@good")).toBe(true);
    });
  });

  it("retires only the matching builds on deleteWhere", async () => {
    const cache = new BuildCache<FakeBuild>(4);
    const main = await cache.get("main@a", async () => new FakeBuild("m"))
      .entry;
    const other = await cache.get("other@a", async () => new FakeBuild("o"))
      .entry;

    cache.deleteWhere((key) => key.startsWith("main@"));
    await flush();

    expect(main.retired).toBe(true);
    expect(other.retired).toBe(false);
    expect(cache.has("other@a")).toBe(true);
  });

  it("forgets a stopped build without dropping a newer one loaded since", async () => {
    const cache = new BuildCache<FakeBuild>(4);
    const crashed = await cache.get("main@a", async () => new FakeBuild("old"))
      .entry;

    cache.forget("main@a", crashed);
    expect(cache.has("main@a")).toBe(false);

    const fresh = await cache.get("main@a", async () => new FakeBuild("new"))
      .entry;
    // A late exit notice from the old worker must not evict its replacement.
    cache.forget("main@a", crashed);

    expect(cache.has("main@a")).toBe(true);
    expect(fresh.retired).toBe(false);
  });
});
