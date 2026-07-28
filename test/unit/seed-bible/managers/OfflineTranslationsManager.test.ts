import {
  createBibleDataManager,
  type BibleDataManager,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  createInMemoryTranslationStore,
  type OfflineTranslationStore,
} from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import {
  EXAMPLE_API_ENDPOINT,
  aabBooks,
  createResponse,
  createStreamingResponse,
  makeChapter,
  makeCompleteTranslation,
  translations,
  type WebResponseMap,
} from "./testUtils/mockBibleApiData";
import type { Mock } from "vitest";

let webGetMock: Mock;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  webGetMock = vi.fn();
  globalThis.fetch = webGetMock as unknown as typeof fetch;
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setWebResponses(responses: WebResponseMap): void {
  webGetMock.mockImplementation((url: string) => {
    const response = responses[url];
    if (!response) {
      return Promise.reject(new Error(`No mocked response for ${url}`));
    }
    return Promise.resolve(response);
  });
}

function makeEndpointUrl(
  path: string,
  endpoint = EXAMPLE_API_ENDPOINT
): string {
  return new URL(path, endpoint).href;
}

/** The AAB translation with a content hash, as the real API reports one. */
function aabWithHash(sha256: string): Translation {
  return { ...aabBooks.translation, sha256 };
}

interface Harness {
  manager: BibleDataManager;
  store: OfflineTranslationStore;
}

async function createHarness(
  responses: WebResponseMap,
  options: { store?: OfflineTranslationStore } = {}
): Promise<Harness> {
  setWebResponses(responses);
  const store = options.store ?? createInMemoryTranslationStore();
  const manager = createBibleDataManager(
    new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
    { offlineStore: store }
  );
  await manager.offline.ready;
  return { manager, store };
}

function defaultResponses(
  overrides: WebResponseMap = {},
  sha256 = "hash-one"
): WebResponseMap {
  return {
    [makeEndpointUrl("api/available_translations.json")]: createResponse({
      translations: [aabWithHash(sha256)],
    }),
    [makeEndpointUrl("api/AAB/books.json")]: createResponse(aabBooks),
    [makeEndpointUrl("api/AAB/complete.json")]: createStreamingResponse(
      makeCompleteTranslation(aabBooks, 2, { sha256 })
    ),
    ...overrides,
  };
}

describe("downloading a translation", () => {
  it("stores every chapter and reports progress while it runs", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();

    const seenPhases: string[] = [];
    const stopWatching = manager.offline.downloads.subscribe((downloads) => {
      const progress = downloads.get("AAB");
      if (progress) {
        seenPhases.push(progress.phase);
      }
    });

    const succeeded = await manager.offline.downloadTranslation("AAB");
    stopWatching();

    expect(succeeded).toBe(true);
    expect(seenPhases).toContain("downloading");
    expect(seenPhases).toContain("saving");
    // Progress is cleared once the download settles.
    expect(manager.offline.downloads.value.size).toBe(0);

    const summary = manager.offline.downloaded.value.get("AAB");
    // Three books in the AAB fixture, two chapters each.
    expect(summary?.numberOfChapters).toBe(6);
    expect(summary?.sizeBytes).toBeGreaterThan(0);
    expect(summary?.updateAvailable).toBe(false);
    expect(manager.offline.isDownloaded("AAB")).toBe(true);
  });

  it("records a failure without throwing so a click handler can't reject", async () => {
    const { manager } = await createHarness(
      defaultResponses({
        [makeEndpointUrl("api/AAB/complete.json")]: createResponse(
          null,
          500,
          "Internal Server Error"
        ),
      })
    );
    await manager.getTranslations();

    const succeeded = await manager.offline.downloadTranslation("AAB");

    expect(succeeded).toBe(false);
    expect(manager.offline.isDownloaded("AAB")).toBe(false);
    expect(manager.offline.errors.value.get("AAB")).toContain("500");
    expect(manager.offline.downloads.value.size).toBe(0);
  });

  it("makes a downloaded translation visible in the translation list without the API", async () => {
    const store = createInMemoryTranslationStore();
    const first = await createHarness(defaultResponses(), { store });
    await first.manager.getTranslations();
    await first.manager.offline.downloadTranslation("AAB");

    // A fresh manager on the same device with no network at all: the stored
    // download is enough for the translation to show up in the selector.
    localStorage.clear();
    const offlineHarness = await createHarness({}, { store });

    expect(
      offlineHarness.manager.availableTranslations.value.map((t) => t.id)
    ).toContain("AAB");
    expect(offlineHarness.manager.offline.isDownloaded("AAB")).toBe(true);
  });
});

describe("reading a downloaded translation", () => {
  it("serves books and chapters from the device instead of the network", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    const callsBefore = webGetMock.mock.calls.length;

    const books = await manager.getTranslationBooks("AAB");
    const chapter = await manager.getTranslationBookChapter("AAB", "GEN", 1);

    expect(webGetMock.mock.calls.length).toBe(callsBefore);
    expect(books.books.map((book) => book.id)).toEqual(["GEN", "EXO", "MAT"]);
    expect(chapter.chapter.number).toBe(1);
    expect(chapter.book.id).toBe("GEN");
    expect(chapter.translation.id).toBe("AAB");
    expect(chapter.numberOfVerses).toBe(2);
    expect(chapter.thisChapterAudioLinks).toEqual({
      reader: "https://audio.example/GEN/1.mp3",
    });
  });

  it("synthesizes the per-chapter links the complete download omits", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    const books = await manager.getTranslationBooks("AAB");
    const genesis = books.books.find((book) => book.id === "GEN");

    expect(genesis?.firstChapterNumber).toBe(1);
    expect(genesis?.lastChapterNumber).toBe(2);
    expect(genesis?.firstChapterApiLink).toBe(
      makeEndpointUrl("api/AAB/GEN/1.json")
    );
    expect(genesis?.lastChapterApiLink).toBe(
      makeEndpointUrl("api/AAB/GEN/2.json")
    );
  });

  it("walks next/previous chapters locally, including across book boundaries", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    const genesis1 = await manager.getTranslationBookChapter("AAB", "GEN", 1);
    const genesis2 = await manager.getNextChapter(genesis1);
    expect(genesis2?.book.id).toBe("GEN");
    expect(genesis2?.chapter.number).toBe(2);

    // Genesis only has two chapters in the fixture, so the next one is the
    // first chapter of the following book.
    const exodus1 = await manager.getNextChapter(genesis2!);
    expect(exodus1?.book.id).toBe("EXO");
    expect(exodus1?.chapter.number).toBe(1);

    const backToGenesis2 = await manager.getPreviousChapter(exodus1!);
    expect(backToGenesis2?.book.id).toBe("GEN");
    expect(backToGenesis2?.chapter.number).toBe(2);

    // Nothing precedes the very first chapter, and nothing follows the last.
    expect(await manager.getPreviousChapter(genesis1)).toBeNull();
    const matthew2 = await manager.getTranslationBookChapter("AAB", "MAT", 2);
    expect(await manager.getNextChapter(matthew2)).toBeNull();
  });

  it("exposes neighbour audio links alongside the navigation links", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    const chapter = await manager.getTranslationBookChapter("AAB", "GEN", 1);

    expect(chapter.previousChapterApiLink).toBeNull();
    expect(chapter.previousChapterAudioLinks).toBeNull();
    expect(chapter.nextChapterApiLink).toBe(
      makeEndpointUrl("api/AAB/GEN/2.json")
    );
    expect(chapter.nextChapterAudioLinks).toEqual({
      reader: "https://audio.example/GEN/2.mp3",
    });
  });

  it("falls back to the API for translations that aren't downloaded", async () => {
    const { manager } = await createHarness(
      defaultResponses({
        [makeEndpointUrl("api/NIV/books.json")]: createResponse({
          translation: translations.translations[1]!,
          books: aabBooks.books,
        }),
        [makeEndpointUrl("api/NIV/GEN/1.json")]: createResponse(
          makeChapter(aabBooks, "GEN", 1)
        ),
      })
    );
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    await manager.getTranslationBookChapter("NIV", "GEN", 1);

    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl("api/NIV/GEN/1.json")
    );
  });

  it("falls back to the API when a chapter is missing from the download", async () => {
    const { manager } = await createHarness(
      defaultResponses({
        [makeEndpointUrl("api/AAB/GEN/40.json")]: createResponse(
          makeChapter(aabBooks, "GEN", 40)
        ),
      })
    );
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    // Chapter 40 exists in the real book but not in the two-chapter fixture.
    const chapter = await manager.getTranslationBookChapter("AAB", "GEN", 40);

    expect(chapter.chapter.number).toBe(40);
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl("api/AAB/GEN/40.json")
    );
  });
});

describe("checking downloads for updates", () => {
  it("flags a download whose content hash no longer matches the API", async () => {
    const { manager } = await createHarness(defaultResponses({}, "hash-one"));
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    expect(manager.offline.downloaded.value.get("AAB")?.updateAvailable).toBe(
      false
    );

    // The API now publishes a different hash for the same translation.
    setWebResponses(defaultResponses({}, "hash-two"));
    await manager.offline.checkForUpdates();

    expect(manager.offline.downloaded.value.get("AAB")?.updateAvailable).toBe(
      true
    );
  });

  it("clears the flag once the newer version is downloaded", async () => {
    const { manager } = await createHarness(defaultResponses({}, "hash-one"));
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    setWebResponses(defaultResponses({}, "hash-two"));
    await manager.offline.checkForUpdates();
    expect(manager.offline.downloaded.value.get("AAB")?.updateAvailable).toBe(
      true
    );

    await manager.offline.downloadTranslation("AAB");

    expect(manager.offline.downloaded.value.get("AAB")?.updateAvailable).toBe(
      false
    );
  });

  it("does not check anything while the device reports no connection", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    const onLineSpy = vi
      .spyOn(navigator, "onLine", "get")
      .mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));

    const callsBefore = webGetMock.mock.calls.length;
    await manager.offline.checkForUpdates();

    expect(webGetMock.mock.calls.length).toBe(callsBefore);
    onLineSpy.mockRestore();
  });

  it("keeps the download usable when the update check can't reach the API", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    // Every request now fails, as it would with no connection.
    setWebResponses({});
    await expect(manager.offline.checkForUpdates()).resolves.toBeUndefined();

    expect(manager.offline.isDownloaded("AAB")).toBe(true);
    expect(
      (await manager.getTranslationBookChapter("AAB", "GEN", 1)).chapter.number
    ).toBe(1);
  });
});

describe("deleting a download", () => {
  it("removes the translation and its chapters, then reads from the API again", async () => {
    const { manager, store } = await createHarness(
      defaultResponses({
        [makeEndpointUrl("api/AAB/GEN/1.json")]: createResponse(
          makeChapter(aabBooks, "GEN", 1)
        ),
      })
    );
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    await manager.offline.deleteTranslation("AAB");

    expect(manager.offline.isDownloaded("AAB")).toBe(false);
    expect(manager.offline.downloaded.value.size).toBe(0);
    expect(await store.get("AAB")).toBeNull();
    expect(await store.getChapter("AAB", "GEN", 1)).toBeNull();

    await manager.getTranslationBookChapter("AAB", "GEN", 1);
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl("api/AAB/GEN/1.json")
    );
  });

  it("leaves other downloads alone", async () => {
    const nivCompleteBooks = {
      translation: translations.translations[1]!,
      books: aabBooks.books,
    };
    const { manager, store } = await createHarness(
      defaultResponses({
        [makeEndpointUrl("api/available_translations.json")]: createResponse({
          translations: [
            aabWithHash("hash-one"),
            { ...translations.translations[1]!, sha256: "niv-hash" },
          ],
        }),
        [makeEndpointUrl("api/NIV/complete.json")]: createStreamingResponse(
          makeCompleteTranslation(nivCompleteBooks, 2, { sha256: "niv-hash" })
        ),
      })
    );
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");
    await manager.offline.downloadTranslation("NIV");

    await manager.offline.deleteTranslation("AAB");

    expect(manager.offline.isDownloaded("NIV")).toBe(true);
    expect(await store.getChapter("NIV", "GEN", 1)).not.toBeNull();
    expect(await store.getChapter("AAB", "GEN", 1)).toBeNull();
  });
});

describe("devices that cannot store downloads", () => {
  it("reports the feature as unsupported and always reads from the API", async () => {
    setWebResponses(defaultResponses());
    const manager = createBibleDataManager(
      new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
      { offlineStore: null }
    );
    await manager.offline.ready;
    await manager.getTranslations();

    expect(manager.offline.supported).toBe(false);
    expect(await manager.offline.downloadTranslation("AAB")).toBe(false);
    expect(manager.offline.isDownloaded("AAB")).toBe(false);

    await manager.getTranslationBooks("AAB");
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl("api/AAB/books.json")
    );
  });
});
