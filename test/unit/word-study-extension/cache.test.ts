import {
  createCachedReader,
  createInMemoryRecordStore,
  type LoadResult,
} from "@packages/word-study-extension/ext_WordStudy/cache";

const TTL_MS = 1000;
const NOT_FOUND_TTL_MS = 100;

class Missing extends Error {}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(10_000);
});

afterEach(() => {
  vi.useRealTimers();
});

function found(value: unknown): Promise<LoadResult> {
  return Promise.resolve({ found: true, value });
}

describe("createCachedReader", () => {
  it("serves an expired record when the network fails", async () => {
    const store = createInMemoryRecordStore();
    store.records.set("a", { value: "old", fetchedAtMs: 0 });
    const reader = createCachedReader({
      store,
      ttlMs: TTL_MS,
      notFoundTtlMs: NOT_FOUND_TTL_MS,
      keepStaleForMs: 60_000,
      notFoundError: () => new Missing(),
    });

    await expect(
      reader.read("a", () => Promise.reject(new TypeError("offline")))
    ).resolves.toBe("old");
  });

  it("still answers 'missing' for an expired 404 when the network fails", async () => {
    const store = createInMemoryRecordStore();
    store.records.set("a", { outcome: "not-found", fetchedAtMs: 0 });
    const reader = createCachedReader({
      store,
      ttlMs: TTL_MS,
      notFoundTtlMs: NOT_FOUND_TTL_MS,
      keepStaleForMs: 60_000,
      notFoundError: () => new Missing(),
    });

    await expect(
      reader.read("a", () => Promise.reject(new TypeError("offline")))
    ).rejects.toBeInstanceOf(Missing);
  });

  it("passes the network's error on when nothing is stored", async () => {
    const reader = createCachedReader({
      store: createInMemoryRecordStore(),
      ttlMs: TTL_MS,
      notFoundTtlMs: NOT_FOUND_TTL_MS,
      keepStaleForMs: 60_000,
      notFoundError: () => new Missing(),
    });

    await expect(
      reader.read("a", () => Promise.reject(new TypeError("offline")))
    ).rejects.toThrow("offline");
  });

  it("keeps expired records for keepStaleForMs before pruning them", async () => {
    const store = createInMemoryRecordStore();
    // Expired, but inside the stale window: kept as the offline answer.
    store.records.set("recent", { value: 1, fetchedAtMs: 10_000 - 5_000 });
    // Past the stale window too: pruned.
    store.records.set("ancient", { value: 2, fetchedAtMs: 0 });
    const reader = createCachedReader({
      store,
      ttlMs: TTL_MS,
      notFoundTtlMs: NOT_FOUND_TTL_MS,
      keepStaleForMs: 6_000,
      notFoundError: () => new Missing(),
    });

    await reader.read("other", () => found("x"));

    expect([...store.records.keys()].sort()).toEqual(["other", "recent"]);
  });
});
