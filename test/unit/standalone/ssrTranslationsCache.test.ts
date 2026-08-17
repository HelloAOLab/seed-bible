import {
  resetSsrTranslationsCacheForTests,
  ssrTranslationsCache,
} from "../../../standalone/ssrTranslationsCache";

const ENDPOINT = "https://example.test/";

beforeEach(() => {
  resetSsrTranslationsCacheForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ssrTranslationsCache", () => {
  it("returns undefined for an endpoint that was never set", () => {
    expect(ssrTranslationsCache.get(ENDPOINT)).toBeUndefined();
  });

  it("round-trips a value set for an endpoint", () => {
    const promise = Promise.resolve([]);

    ssrTranslationsCache.set(ENDPOINT, promise);

    expect(ssrTranslationsCache.get(ENDPOINT)).toBe(promise);
  });

  it("delete() removes a cached entry", () => {
    ssrTranslationsCache.set(ENDPOINT, Promise.resolve([]));

    ssrTranslationsCache.delete(ENDPOINT);

    expect(ssrTranslationsCache.get(ENDPOINT)).toBeUndefined();
  });

  it("expires an entry once its TTL has elapsed", () => {
    vi.useFakeTimers();
    const promise = Promise.resolve([]);
    ssrTranslationsCache.set(ENDPOINT, promise);

    // Just under the 1-hour default TTL: still cached.
    vi.advanceTimersByTime(60 * 60_000 - 1);
    expect(ssrTranslationsCache.get(ENDPOINT)).toBe(promise);

    // Past the TTL: treated as a miss, and the stale entry is dropped.
    vi.advanceTimersByTime(2);
    expect(ssrTranslationsCache.get(ENDPOINT)).toBeUndefined();
  });

  it("keys entries independently per endpoint", () => {
    const promiseA = Promise.resolve([]);
    const promiseB = Promise.resolve([]);

    ssrTranslationsCache.set("https://a.example/", promiseA);
    ssrTranslationsCache.set("https://b.example/", promiseB);

    expect(ssrTranslationsCache.get("https://a.example/")).toBe(promiseA);
    expect(ssrTranslationsCache.get("https://b.example/")).toBe(promiseB);
  });
});
