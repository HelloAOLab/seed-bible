import {
  createSsrPromiseCache,
  positiveIntegerFromEnv,
} from "../../../standalone/ssrPromiseCache";

afterEach(() => {
  vi.useRealTimers();
});

describe("createSsrPromiseCache", () => {
  it("returns what was set until the TTL elapses", () => {
    vi.useFakeTimers();
    const cache = createSsrPromiseCache<number>({ ttlMs: 1000, maxEntries: 5 });
    const promise = Promise.resolve(1);
    cache.set("a", promise);

    vi.advanceTimersByTime(999);
    expect(cache.get("a")).toBe(promise);

    vi.advanceTimersByTime(2);
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the oldest entry once the size bound is exceeded", () => {
    const cache = createSsrPromiseCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("a", Promise.resolve(1));
    cache.set("b", Promise.resolve(2));
    cache.set("c", Promise.resolve(3));

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
  });

  it("re-setting a key refreshes its position and TTL", () => {
    const cache = createSsrPromiseCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("a", Promise.resolve(1));
    cache.set("b", Promise.resolve(2));
    cache.set("a", Promise.resolve(3));
    cache.set("c", Promise.resolve(4));

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
  });

  it("delete removes an entry", () => {
    const cache = createSsrPromiseCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("a", Promise.resolve(1));
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the least recently used entry, not the oldest inserted", () => {
    const cache = createSsrPromiseCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("a", Promise.resolve(1));
    cache.set("b", Promise.resolve(2));
    cache.get("a");
    cache.set("c", Promise.resolve(3));

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
  });

  it("does not extend an entry's TTL when it is read", () => {
    vi.useFakeTimers();
    const cache = createSsrPromiseCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("a", Promise.resolve(1));

    vi.advanceTimersByTime(900);
    expect(cache.get("a")).toBeDefined();
    vi.advanceTimersByTime(200);

    expect(cache.get("a")).toBeUndefined();
  });
});

describe("positiveIntegerFromEnv", () => {
  it.each([
    ["0.5", 500],
    ["0", 500],
    ["-3", 500],
    ["", 500],
    ["abc", 500],
    [undefined, 500],
    ["1.9", 1],
    ["42", 42],
  ])("parses %j as %i", (raw, expected) => {
    expect(positiveIntegerFromEnv(raw, 500)).toBe(expected);
  });
});
