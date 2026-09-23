import {
  createTheographicClient,
  THEOGRAPHIC_CACHE_TTL_MS,
  THEOGRAPHIC_NOT_FOUND_TTL_MS,
  TheographicRequestError,
  type TheographicStore,
} from "@packages/theographic-extension/ext_theographic/provider";
import type { Mock } from "vitest";
import { createInMemoryTheographicStore } from "./memoryStore";

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

function respond(status: number, statusText: string, body: string) {
  return { status, statusText, text: () => Promise.resolve(body) };
}

function ok<T>(payload: T) {
  return respond(200, "OK", JSON.stringify(payload));
}

function notFound() {
  return respond(404, "Not Found", "");
}

function serverError() {
  return respond(500, "Server Error", "");
}

const CHAPTER = { chapter: { number: 1, people: [], places: [], events: [] } };

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

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

  it("fetches another site's file as given", async () => {
    const url = "https://raw.githubusercontent.com/o/r/main/Erech.geojson";
    fetchMock.mockResolvedValue(ok({ type: "Feature" }));
    const client = createTheographicClient(ENDPOINT, null);

    await expect(client.getResource(url)).resolves.toEqual({
      type: "Feature",
    });
    expect(fetchMock).toHaveBeenCalledWith(url);
  });

  it("reports a 404 as 'not found', which the provider treats as 'nothing here'", async () => {
    fetchMock.mockResolvedValue(notFound());
    const client = createTheographicClient(ENDPOINT, null);

    const error = await rejection(client.getChapter("PRO", 27));

    expect(error).toBeInstanceOf(TheographicRequestError);
    expect(error).toMatchObject({ reason: "not-found", status: 404 });
  });

  it("reports any other failure as 'failed'", async () => {
    fetchMock.mockResolvedValue(serverError());
    const client = createTheographicClient(ENDPOINT, null);

    await expect(rejection(client.getChapter("GEN", 1))).resolves.toMatchObject(
      { reason: "failed", status: 500 }
    );
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

  it("does not cache a server error, so a retry actually retries", async () => {
    fetchMock
      .mockResolvedValueOnce(serverError())
      .mockResolvedValueOnce(ok(CHAPTER));
    const client = createTheographicClient(
      ENDPOINT,
      createInMemoryTheographicStore()
    );

    await expect(client.getChapter("GEN", 1)).rejects.toThrow();
    await expect(client.getChapter("GEN", 1)).resolves.toEqual(CHAPTER);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("a body past maxLength", () => {
    const url = "https://raw.githubusercontent.com/o/r/main/Crete.geojson";
    const crete = { type: "FeatureCollection", features: ["x".repeat(500)] };

    it("rejects as 'too large'", async () => {
      fetchMock.mockResolvedValue(ok(crete));
      const client = createTheographicClient(ENDPOINT, null);

      await expect(
        rejection(client.getResource(url, { maxLength: 100 }))
      ).resolves.toMatchObject({ reason: "too-large" });
    });

    it("is remembered as too large, without keeping the body", async () => {
      fetchMock.mockResolvedValue(ok(crete));
      const store = createInMemoryTheographicStore();

      await rejection(
        createTheographicClient(ENDPOINT, store).getResource(url, {
          maxLength: 100,
        })
      );
      const afterReload = createTheographicClient(ENDPOINT, store);
      await expect(
        rejection(afterReload.getResource(url, { maxLength: 100 }))
      ).resolves.toMatchObject({ reason: "too-large" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(store.records.get(url)).not.toHaveProperty("value");
    });

    it("is fetched again for a caller that allows more", async () => {
      fetchMock.mockResolvedValue(ok(crete));
      const store = createInMemoryTheographicStore();

      await rejection(
        createTheographicClient(ENDPOINT, store).getResource(url, {
          maxLength: 100,
        })
      );
      await expect(
        createTheographicClient(ENDPOINT, store).getResource(url)
      ).resolves.toEqual(crete);
    });
  });

  describe("with a store", () => {
    it("writes what it fetches into the store", async () => {
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const store = createInMemoryTheographicStore();
      const client = createTheographicClient(ENDPOINT, store);

      await client.getChapter("GEN", 1);

      expect(store.records.get(CHAPTER_PATH)?.value).toEqual(CHAPTER);
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

    it("serves a record cached before misses were cached too", async () => {
      // Records written by the first version of this cache carry no outcome.
      const store = createInMemoryTheographicStore();
      await store.put(CHAPTER_PATH, {
        value: CHAPTER,
        fetchedAtMs: Date.now(),
      });

      await expect(
        createTheographicClient(ENDPOINT, store).getChapter("GEN", 1)
      ).resolves.toEqual(CHAPTER);
      expect(fetchMock).not.toHaveBeenCalled();
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

    it("remembers a missing chapter, so revisiting it costs no request", async () => {
      fetchMock.mockResolvedValue(notFound());
      const store = createInMemoryTheographicStore();

      await rejection(
        createTheographicClient(ENDPOINT, store).getChapter("PRO", 27)
      );
      const afterReload = createTheographicClient(ENDPOINT, store);
      await expect(
        rejection(afterReload.getChapter("PRO", 27))
      ).resolves.toMatchObject({ reason: "not-found" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("asks about a missing chapter again after a day", async () => {
      vi.useFakeTimers();
      fetchMock
        .mockResolvedValueOnce(notFound())
        .mockResolvedValueOnce(ok(CHAPTER));
      const store = createInMemoryTheographicStore();

      await rejection(
        createTheographicClient(ENDPOINT, store).getChapter("GEN", 1)
      );
      vi.advanceTimersByTime(THEOGRAPHIC_NOT_FOUND_TTL_MS + 1);

      await expect(
        createTheographicClient(ENDPOINT, store).getChapter("GEN", 1)
      ).resolves.toEqual(CHAPTER);
    });

    it("clears out expired records on its first read", async () => {
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const store = createInMemoryTheographicStore();
      await store.put("/api/d/theographic/OLD/1.json", {
        value: CHAPTER,
        fetchedAtMs: Date.now() - THEOGRAPHIC_CACHE_TTL_MS - 1,
      });
      await store.put("/api/d/theographic/NEW/1.json", {
        value: CHAPTER,
        fetchedAtMs: Date.now(),
      });

      await createTheographicClient(ENDPOINT, store).getChapter("GEN", 1);

      expect([...store.records.keys()].sort()).toEqual([
        "/api/d/theographic/GEN/1.json",
        "/api/d/theographic/NEW/1.json",
      ]);
    });

    it("falls back to the network when the store cannot be read", async () => {
      fetchMock.mockResolvedValue(ok(CHAPTER));
      const broken: TheographicStore = {
        get: () => Promise.reject(new Error("storage blocked")),
        put: () => Promise.resolve(),
        prune: () => Promise.reject(new Error("storage blocked")),
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
        prune: () => Promise.resolve(),
        clear: () => Promise.resolve(),
      };

      await expect(
        createTheographicClient(ENDPOINT, readOnly).getChapter("GEN", 1)
      ).resolves.toEqual(CHAPTER);
    });
  });
});
