import {
  createInMemoryTheographicStore,
  createTheographicClient,
  THEOGRAPHIC_CACHE_TTL_MS,
  type TheographicStore,
} from "@packages/seed-bible/seed-bible/managers/TheographicDiscoverProvider";
import type { Mock } from "vitest";

const ENDPOINT = "https://bible.helloao.org/";
const CHAPTER_PATH = "/api/d/theographic/GEN/1.json";

let fetchMock: Mock;
let originalFetch: typeof globalThis.fetch;

beforeAll(() => {
  originalFetch = globalThis.fetch;
});

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

function ok<T>(payload: T) {
  return {
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(payload),
  };
}

function notFound() {
  return {
    status: 404,
    statusText: "Not Found",
    json: () => Promise.resolve(null),
  };
}

const CHAPTER = { chapter: { number: 1, people: [], places: [], events: [] } };

describe("createTheographicClient", () => {
  it("fetches a chapter from the dataset path", async () => {
    fetchMock.mockResolvedValue(ok(CHAPTER));
    const client = createTheographicClient(ENDPOINT, null);

    await expect(client.getChapter("GEN", 1)).resolves.toEqual(CHAPTER);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bible.helloao.org/api/d/theographic/GEN/1.json"
    );
  });

  it("encodes the book and chapter", async () => {
    fetchMock.mockResolvedValue(ok(CHAPTER));
    const client = createTheographicClient(ENDPOINT, null);

    await client.getChapter("1 John", "1:2");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://bible.helloao.org/api/d/theographic/1%20John/1%3A2.json"
    );
  });

  it("resolves an entity's apiLink against the endpoint", async () => {
    const person = { person: { id: "aaron_1", name: "Aaron" } };
    fetchMock.mockResolvedValue(ok(person));
    const client = createTheographicClient(ENDPOINT, null);

    await expect(
      client.getEntity("/api/d/theographic/people/aaron_1.json")
    ).resolves.toEqual(person);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bible.helloao.org/api/d/theographic/people/aaron_1.json"
    );
  });

  it("surfaces a 404 so the provider can treat it as 'nothing here'", async () => {
    fetchMock.mockResolvedValue(notFound());
    const client = createTheographicClient(ENDPOINT, null);

    await expect(client.getChapter("PRO", 27)).rejects.toThrow(/Status: 404/);
  });

  it("shares one request between simultaneous callers", async () => {
    fetchMock.mockResolvedValue(ok(CHAPTER));
    const client = createTheographicClient(ENDPOINT, null);

    const [a, b] = await Promise.all([
      client.getChapter("GEN", 1),
      client.getChapter("GEN", 1),
    ]);

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure, so a retry actually retries", async () => {
    fetchMock
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(ok(CHAPTER));
    const client = createTheographicClient(
      ENDPOINT,
      createInMemoryTheographicStore()
    );

    await expect(client.getChapter("GEN", 1)).rejects.toThrow();
    await expect(client.getChapter("GEN", 1)).resolves.toEqual(CHAPTER);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("with a store", () => {
    it("writes what it fetches into the store", async () => {
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const store = createInMemoryTheographicStore();
      const client = createTheographicClient(ENDPOINT, store);

      await client.getChapter("GEN", 1);

      await expect(store.get(CHAPTER_PATH)).resolves.toEqual(CHAPTER);
    });

    it("serves a later read from the store instead of the network", async () => {
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const store = createInMemoryTheographicStore();

      await createTheographicClient(ENDPOINT, store).getChapter("GEN", 1);
      // A fresh client stands in for a page reload: the in-flight map and any
      // in-memory state are gone, so only the store can prevent a refetch.
      const afterReload = createTheographicClient(ENDPOINT, store);
      await expect(afterReload.getChapter("GEN", 1)).resolves.toEqual(CHAPTER);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("refetches once a cached record has aged out", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const store = createInMemoryTheographicStore();

      await createTheographicClient(ENDPOINT, store).getChapter("GEN", 1);
      vi.advanceTimersByTime(THEOGRAPHIC_CACHE_TTL_MS + 1);
      await createTheographicClient(ENDPOINT, store).getChapter("GEN", 1);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("falls back to the network when the store cannot be read", async () => {
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const broken: TheographicStore = {
        get: () => Promise.reject(new Error("storage blocked")),
        put: () => Promise.resolve(),
        clear: () => Promise.resolve(),
      };

      await expect(
        createTheographicClient(ENDPOINT, broken).getChapter("GEN", 1)
      ).resolves.toEqual(CHAPTER);
    });

    it("still returns data when the store cannot be written", async () => {
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const readOnly: TheographicStore = {
        get: () => Promise.resolve(null),
        put: () => Promise.reject(new Error("quota exceeded")),
        clear: () => Promise.resolve(),
      };

      await expect(
        createTheographicClient(ENDPOINT, readOnly).getChapter("GEN", 1)
      ).resolves.toEqual(CHAPTER);
    });
  });
});

describe("createInMemoryTheographicStore", () => {
  it("round-trips a value", async () => {
    const store = createInMemoryTheographicStore();
    await store.put("a", { hello: "world" });

    await expect(store.get("a")).resolves.toEqual({ hello: "world" });
  });

  it("reports a miss for an unknown key", async () => {
    await expect(
      createInMemoryTheographicStore().get("nope")
    ).resolves.toBeNull();
  });

  it("expires a value past the TTL", async () => {
    vi.useFakeTimers();
    const store = createInMemoryTheographicStore();
    await store.put("a", 1);

    vi.advanceTimersByTime(THEOGRAPHIC_CACHE_TTL_MS + 1);

    await expect(store.get("a")).resolves.toBeNull();
  });

  it("drops everything on clear", async () => {
    const store = createInMemoryTheographicStore();
    await store.put("a", 1);
    await store.clear();

    await expect(store.get("a")).resolves.toBeNull();
  });
});
