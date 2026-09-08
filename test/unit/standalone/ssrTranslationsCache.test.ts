import {
  resetSsrTranslationsCacheForTests,
  ssrTranslationsCache,
  TTL_MS,
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

    // Just under the TTL: still cached.
    vi.advanceTimersByTime(TTL_MS - 1);
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

// `TTL_MS` is a module-level constant read from `process.env` once at import
// time, so exercising different env values means re-importing the module
// fresh each time rather than calling an exported function.
describe("TTL_MS env var parsing", () => {
  const ENV_VAR = "SSR_TRANSLATIONS_CACHE_TTL_MS";
  const originalEnv = { ...process.env };
  const DEFAULT_TTL_MS = 60 * 60_000;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function importWithEnv(value: string | undefined) {
    if (value === undefined) {
      delete process.env[ENV_VAR];
    } else {
      process.env[ENV_VAR] = value;
    }
    vi.resetModules();
    return import("../../../standalone/ssrTranslationsCache");
  }

  it("defaults to 1 hour when the env var is unset", async () => {
    const mod = await importWithEnv(undefined);
    expect(mod.TTL_MS).toBe(DEFAULT_TTL_MS);
  });

  it("defaults to 1 hour rather than 0 when the env var is an empty string", async () => {
    // Number("") is 0, which would otherwise expire every entry instantly.
    const mod = await importWithEnv("");
    expect(mod.TTL_MS).toBe(DEFAULT_TTL_MS);
  });

  it("defaults to 1 hour rather than never expiring on a non-numeric value", async () => {
    // Number("1h") is NaN, and `NaN <= Date.now()` is always false, which
    // would otherwise mean entries never expire.
    const mod = await importWithEnv("1h");
    expect(mod.TTL_MS).toBe(DEFAULT_TTL_MS);
  });

  it("defaults to 1 hour on a negative value", async () => {
    const mod = await importWithEnv("-1000");
    expect(mod.TTL_MS).toBe(DEFAULT_TTL_MS);
  });

  it("uses a valid positive numeric override", async () => {
    const mod = await importWithEnv("120000");
    expect(mod.TTL_MS).toBe(120_000);
  });
});
