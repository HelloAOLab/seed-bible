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

  it("stores nothing when cancelled while it is saving to the device", async () => {
    const store = createInMemoryTranslationStore();
    let onSaveStart = () => {};
    const cancellableStore: OfflineTranslationStore = {
      ...store,
      async save(record, entries, options) {
        // Stands in for the user tapping cancel during the saving phase, which
        // is short enough on a real device to be awkward to hit deliberately.
        onSaveStart();
        return await store.save(record, entries, options);
      },
    };
    const { manager } = await createHarness(defaultResponses(), {
      store: cancellableStore,
    });
    onSaveStart = () => manager.offline.cancelDownload("AAB");
    await manager.getTranslations();

    const succeeded = await manager.offline.downloadTranslation("AAB");

    expect(succeeded).toBe(false);
    expect(manager.offline.isDownloaded("AAB")).toBe(false);
    expect(await store.get("AAB")).toBeNull();
    expect(await store.getChapter("AAB", "GEN", 1)).toBeNull();
    // Cancelling is a choice, not a failure, so it leaves no error to report.
    expect(manager.offline.errors.value.get("AAB")).toBeUndefined();
    expect(manager.offline.downloads.value.size).toBe(0);
  });

  it("stops claiming a translation is downloaded when replacing it fails", async () => {
    const store = createInMemoryTranslationStore();
    let failNextSave = false;
    const flakyStore: OfflineTranslationStore = {
      ...store,
      async save(record, entries, options) {
        if (failNextSave) {
          // Saving replaces the previous copy, so it clears it first — which is
          // why a failure here leaves the device with nothing.
          await store.delete(record.translationId);
          throw new Error("The device ran out of space.");
        }
        return await store.save(record, entries, options);
      },
    };
    const { manager } = await createHarness(defaultResponses({}, "hash-one"), {
      store: flakyStore,
    });
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");
    expect(manager.offline.isDownloaded("AAB")).toBe(true);

    failNextSave = true;
    setWebResponses(defaultResponses({}, "hash-two"));
    const succeeded = await manager.offline.downloadTranslation("AAB");

    expect(succeeded).toBe(false);
    // The UI must not offer to read a translation the device no longer holds.
    expect(manager.offline.isDownloaded("AAB")).toBe(false);
    expect(manager.offline.errors.value.get("AAB")).toContain("out of space");
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

  it("answers the ends of the Bible without touching the network", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    const genesis1 = await manager.getTranslationBookChapter("AAB", "GEN", 1);
    const matthew2 = await manager.getTranslationBookChapter("AAB", "MAT", 2);
    const callsBefore = webGetMock.mock.calls.length;

    // A chapter read from the download carries no previous/next link at the
    // edges of the Bible, so "there is no such chapter" is answered locally —
    // it doesn't degrade into a request that would fail with no connection.
    expect(await manager.getPreviousChapter(genesis1)).toBeNull();
    expect(await manager.getNextChapter(matthew2)).toBeNull();
    expect(webGetMock.mock.calls.length).toBe(callsBefore);
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
      makeEndpointUrl("api/NIV/GEN/1.json"),
      expect.any(Object)
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
      makeEndpointUrl("api/AAB/GEN/40.json"),
      expect.any(Object)
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

  it("keeps the flag raised after the downloaded translation is read", async () => {
    const { manager } = await createHarness(defaultResponses({}, "hash-one"));
    await manager.getTranslations();
    await manager.offline.downloadTranslation("AAB");

    setWebResponses(defaultResponses({}, "hash-two"));
    await manager.offline.checkForUpdates();
    expect(manager.offline.downloaded.value.get("AAB")?.updateAvailable).toBe(
      true
    );

    // Opening the translation loads its books from the device, and the metadata
    // saved alongside them still carries the download-time hash. Folding that
    // back into the translation list must not overwrite the newer hash the check
    // just found, or the update button would vanish.
    await manager.getTranslationBooks("AAB");

    expect(
      manager.availableTranslations.value.find((t) => t.id === "AAB")?.sha256
    ).toBe("hash-two");
    expect(manager.offline.downloaded.value.get("AAB")?.updateAvailable).toBe(
      true
    );
  });

  it("keeps the flag raised when the stored copy loads after the API list", async () => {
    const store = createInMemoryTranslationStore();
    const first = await createHarness(defaultResponses({}, "hash-one"), {
      store,
    });
    await first.manager.getTranslations();
    await first.manager.offline.downloadTranslation("AAB");
    first.manager.offline.dispose();

    // A new page load, by which time the API publishes a newer version. The
    // stored copy is deliberately made to load last, since on a real device the
    // storage read and the API request race each other.
    localStorage.clear();
    setWebResponses(defaultResponses({}, "hash-two"));
    let releaseStoredRead = () => {};
    const slowStore: OfflineTranslationStore = {
      ...store,
      async list() {
        await new Promise<void>((resolve) => {
          releaseStoredRead = resolve;
        });
        return store.list();
      },
    };
    const manager = createBibleDataManager(
      new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
      { offlineStore: slowStore }
    );

    await manager.getTranslations();
    releaseStoredRead();
    await manager.offline.ready;

    expect(
      manager.availableTranslations.value.find((t) => t.id === "AAB")?.sha256
    ).toBe("hash-two");
    expect(manager.offline.downloaded.value.get("AAB")?.updateAvailable).toBe(
      true
    );
    manager.offline.dispose();
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
      makeEndpointUrl("api/AAB/GEN/1.json"),
      expect.any(Object)
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

describe("disposing the manager", () => {
  it("stops listening for connection changes", async () => {
    const { manager } = await createHarness(defaultResponses());
    await manager.getTranslations();

    const onLineSpy = vi.spyOn(navigator, "onLine", "get");
    onLineSpy.mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));
    expect(manager.offline.isOnline.value).toBe(false);

    manager.offline.dispose();

    onLineSpy.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));

    // Still false: the listener that would have flipped it is gone, so a
    // discarded manager can't keep reacting to the page around it.
    expect(manager.offline.isOnline.value).toBe(false);
    onLineSpy.mockRestore();
  });

  it("cancels a download that is still running", async () => {
    const store = createInMemoryTranslationStore();
    let onSaveStart = () => {};
    const cancellableStore: OfflineTranslationStore = {
      ...store,
      async save(record, entries, options) {
        onSaveStart();
        return await store.save(record, entries, options);
      },
    };
    const { manager } = await createHarness(defaultResponses(), {
      store: cancellableStore,
    });
    onSaveStart = () => manager.offline.dispose();
    await manager.getTranslations();

    expect(await manager.offline.downloadTranslation("AAB")).toBe(false);
    expect(await store.get("AAB")).toBeNull();
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
      makeEndpointUrl("api/AAB/books.json"),
      expect.any(Object)
    );
  });
});
