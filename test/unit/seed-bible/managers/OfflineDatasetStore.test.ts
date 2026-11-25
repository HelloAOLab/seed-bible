import type { Mock } from "vitest";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  ApiRequestError,
  FreeUseBibleAPI,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  DATASET_CACHE_TTL_MS,
  DATASET_DB_OPEN_TIMEOUT_MS,
  DATASET_KEEP_STALE_MS,
  DATASET_NOT_FOUND_TTL_MS,
  createInMemoryDatasetStore,
  createIndexedDbDatasetStore,
  type OfflineDatasetStore,
} from "@packages/seed-bible/seed-bible/managers/OfflineDatasetStore";
import {
  EXAMPLE_API_ENDPOINT,
  createResponse,
} from "./testUtils/mockBibleApiData";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHAPTER_PATH = "api/d/bsb-interlinear/JHN/1.json";

let fetchMock: Mock;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.reject(new Error("No network in tests")));
  globalThis.fetch = fetchMock;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

/** Answers the API paths given; every other path is a 404, like the real API. */
function serve(files: Record<string, unknown>) {
  fetchMock.mockImplementation((url: string) => {
    const path = new URL(url).pathname.slice(1);
    return Promise.resolve(
      path in files
        ? createResponse(files[path])
        : createResponse(null, 404, "Not Found")
    );
  });
}

function goOffline() {
  fetchMock.mockImplementation(() =>
    Promise.reject(new TypeError("Failed to fetch"))
  );
}

/** Polls `condition`, yielding to pending work between checks. */
async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 2000
): Promise<void> {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function chapter(gloss: string) {
  return {
    chapter: { number: 1, content: [{ verse: 1, words: [{ gloss }] }] },
  };
}

/**
 * The app as one page load sees it: a fresh API client, so nothing is
 * remembered in memory from an earlier "visit", over the given device store.
 */
function visit(
  store: OfflineDatasetStore | null,
  endpoint: string = EXAMPLE_API_ENDPOINT
) {
  return createBibleDataManager(new FreeUseBibleAPI(endpoint), {
    datasetStore: store,
  });
}

function readChapter(
  store: OfflineDatasetStore | null,
  options?: { refresh?: boolean; signal?: AbortSignal }
) {
  return visit(store).getDatasetBookChapter(
    "bsb-interlinear",
    "JHN",
    1,
    options
  );
}

describe("dataset files kept on the device", () => {
  it("answers a later visit without the network", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const store = createInMemoryDatasetStore();
    await readChapter(store);
    fetchMock.mockClear();

    const result = await readChapter(store);

    expect(result.chapter.content[0]).toEqual({
      verse: 1,
      words: [{ gloss: "In" }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps book lists and lexicon entries too", async () => {
    serve({
      "api/d/bsb-interlinear/books.json": { books: [{ id: "JHN" }] },
      "api/d/stepbible-lexicon/lexicon/G3056.json": { entry: { id: "G3056" } },
    });
    const store = createInMemoryDatasetStore();
    await visit(store).getDatasetBooks("bsb-interlinear");
    await visit(store).getDatasetLexiconEntry("stepbible-lexicon", "G3056");
    fetchMock.mockClear();

    const books = await visit(store).getDatasetBooks("bsb-interlinear");
    const entry = await visit(store).getDatasetLexiconEntry(
      "stepbible-lexicon",
      "G3056"
    );

    expect(books.books[0]?.id).toBe("JHN");
    expect(entry.entry.id).toBe("G3056");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads a file again once the kept copy has expired", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const store = createInMemoryDatasetStore();
    await readChapter(store);

    vi.setSystemTime(Date.now() + DATASET_CACHE_TTL_MS + DAY_MS);
    serve({ [CHAPTER_PATH]: chapter("Corrected") });

    const result = await readChapter(store);

    expect(result.chapter.content[0]).toEqual({
      verse: 1,
      words: [{ gloss: "Corrected" }],
    });
  });

  it("serves an expired copy when the network is down", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const store = createInMemoryDatasetStore();
    await readChapter(store);

    vi.setSystemTime(Date.now() + DATASET_CACHE_TTL_MS + DAY_MS);
    goOffline();

    const result = await readChapter(store);

    expect(result.chapter.content[0]).toEqual({
      verse: 1,
      words: [{ gloss: "In" }],
    });
  });

  it("rejects with the network's error when offline with nothing kept", async () => {
    goOffline();

    await expect(readChapter(createInMemoryDatasetStore())).rejects.toThrow(
      "Failed to fetch"
    );
  });

  it("asks the network first when told to refresh", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const store = createInMemoryDatasetStore();
    await readChapter(store);
    serve({ [CHAPTER_PATH]: chapter("Corrected") });

    const result = await readChapter(store, { refresh: true });

    expect(result.chapter.content[0]).toEqual({
      verse: 1,
      words: [{ gloss: "Corrected" }],
    });
  });

  it("rejects a cancelled request instead of serving an expired copy", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const store = createInMemoryDatasetStore();
    await readChapter(store);
    vi.setSystemTime(Date.now() + DATASET_CACHE_TTL_MS + DAY_MS);
    const controller = new AbortController();
    controller.abort();

    await expect(
      readChapter(store, { signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("saves a file once when several reads ask for it at the same time", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const memory = createInMemoryDatasetStore();
    const saves: string[] = [];
    const store: OfflineDatasetStore = {
      get: (key) => memory.get(key),
      put: (key, record) => {
        saves.push(key);
        return memory.put(key, record);
      },
      prune: (cutoffMs) => memory.prune(cutoffMs),
    };
    const app = visit(store);

    const results = await Promise.all([
      app.getDatasetBookChapter("bsb-interlinear", "JHN", 1),
      app.getDatasetBookChapter("bsb-interlinear", "JHN", 1),
      app.getDatasetBookChapter("bsb-interlinear", "JHN", 1),
    ]);

    expect(results.map((result) => result.chapter.content[0])).toEqual([
      { verse: 1, words: [{ gloss: "In" }] },
      { verse: 1, words: [{ gloss: "In" }] },
      { verse: 1, words: [{ gloss: "In" }] },
    ]);
    expect(saves).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps each endpoint's files apart", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const store = createInMemoryDatasetStore();
    await readChapter(store);
    fetchMock.mockClear();

    await visit(store, "https://other.example").getDatasetBookChapter(
      "bsb-interlinear",
      "JHN",
      1
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches every time with no device store", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    await readChapter(null);
    await readChapter(null);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still reads from the network when storage fails", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const broken: OfflineDatasetStore = {
      get: () => Promise.reject(new Error("blocked")),
      put: () => Promise.reject(new Error("full")),
      prune: () => Promise.reject(new Error("blocked")),
    };

    const result = await readChapter(broken);

    expect(result.chapter.content[0]).toEqual({
      verse: 1,
      words: [{ gloss: "In" }],
    });
  });

  it("hands over a downloaded file without waiting for it to be saved", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const memory = createInMemoryDatasetStore();
    const slowToSave: OfflineDatasetStore = {
      get: (key) => memory.get(key),
      put: () => new Promise(() => undefined),
      prune: (cutoffMs) => memory.prune(cutoffMs),
    };

    const result = await readChapter(slowToSave);

    expect(result.chapter.content[0]).toEqual({
      verse: 1,
      words: [{ gloss: "In" }],
    });
  });

  describe("a file the API doesn't have", () => {
    it("is remembered for a day, as the same 404", async () => {
      serve({});
      const store = createInMemoryDatasetStore();
      await expect(readChapter(store)).rejects.toBeInstanceOf(ApiRequestError);
      fetchMock.mockClear();

      const remembered = await readChapter(store).catch((error) => error);

      expect(remembered).toBeInstanceOf(ApiRequestError);
      expect((remembered as ApiRequestError).status).toBe(404);
      expect((remembered as ApiRequestError).url).toBe(
        new URL(CHAPTER_PATH, EXAMPLE_API_ENDPOINT).href
      );
      expect(fetchMock).not.toHaveBeenCalled();

      vi.setSystemTime(Date.now() + DATASET_NOT_FOUND_TTL_MS + 1000);
      serve({ [CHAPTER_PATH]: chapter("Added") });

      const added = await readChapter(store);
      expect(added.chapter.content[0]).toEqual({
        verse: 1,
        words: [{ gloss: "Added" }],
      });
    });

    it("is still missing when the network is down after a day", async () => {
      serve({});
      const store = createInMemoryDatasetStore();
      await readChapter(store).catch(() => undefined);
      vi.setSystemTime(Date.now() + DATASET_NOT_FOUND_TTL_MS + 1000);
      goOffline();

      const result = await readChapter(store).catch((error) => error);

      expect((result as ApiRequestError).status).toBe(404);
    });
  });

  it("looks up the reader's file before clearing out old ones", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const memory = createInMemoryDatasetStore();
    const calls: string[] = [];
    const store: OfflineDatasetStore = {
      get: (key) => {
        calls.push("get");
        return memory.get(key);
      },
      put: (key, record) => memory.put(key, record),
      prune: (cutoffMs) => {
        calls.push("prune");
        return memory.prune(cutoffMs);
      },
    };

    await readChapter(store);
    await waitForCondition(() => calls.includes("prune"));

    expect(calls).toEqual(["get", "prune"]);
  });

  it("clears out files past the offline window after the first read", async () => {
    serve({ [CHAPTER_PATH]: chapter("In") });
    const store = createInMemoryDatasetStore();
    const now = Date.now();
    // Expired, but inside the offline window: kept as the offline answer.
    store.records.set("recent", {
      outcome: "found",
      value: 1,
      fetchedAtMs: now - DATASET_CACHE_TTL_MS - DAY_MS,
    });
    // Past the offline window too: cleared.
    store.records.set("ancient", {
      outcome: "found",
      value: 2,
      fetchedAtMs: now - DATASET_CACHE_TTL_MS - DATASET_KEEP_STALE_MS - DAY_MS,
    });

    await readChapter(store);
    await waitForCondition(() => !store.records.has("ancient"));

    expect(store.records.has("recent")).toBe(true);
  });
});

describe("createIndexedDbDatasetStore()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null where IndexedDB is unavailable", () => {
    expect(createIndexedDbDatasetStore()).toBeNull();
  });

  it("falls back to the network when the database never opens, waiting only once", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    // An open request whose success or error never fires.
    vi.stubGlobal("indexedDB", { open: () => ({}) });
    serve({
      [CHAPTER_PATH]: chapter("In"),
      "api/d/stepbible-lexicon/lexicon/G3056.json": { entry: { id: "G3056" } },
    });
    const app = createBibleDataManager(
      new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT)
    );

    const first = app.getDatasetBookChapter("bsb-interlinear", "JHN", 1);
    await vi.advanceTimersByTimeAsync(DATASET_DB_OPEN_TIMEOUT_MS);

    expect((await first).chapter.content[0]).toEqual({
      verse: 1,
      words: [{ gloss: "In" }],
    });

    // A later read that waited on the database again would take the full
    // timeout; it must settle well inside it.
    vi.useRealTimers();
    let later: unknown = null;
    void app
      .getDatasetLexiconEntry("stepbible-lexicon", "G3056")
      .then((entry) => {
        later = entry;
      });
    await waitForCondition(
      () => later !== null,
      DATASET_DB_OPEN_TIMEOUT_MS / 3
    );

    expect(later).toEqual({ entry: { id: "G3056" } });
  });
});
