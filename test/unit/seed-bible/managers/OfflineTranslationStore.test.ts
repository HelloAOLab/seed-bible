import {
  createInMemoryTranslationStore,
  createIndexedDbTranslationStore,
  type DownloadedTranslation,
  type StoredChapterEntry,
} from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import { aabBooks } from "./testUtils/mockBibleApiData";

function makeRecord(
  translationId: string,
  overrides: Partial<DownloadedTranslation> = {}
): DownloadedTranslation {
  return {
    translationId,
    endpoint: "https://example.test/",
    sha256: "hash",
    downloadedAt: 1_700_000_000_000,
    sizeBytes: 1024,
    numberOfChapters: 2,
    translation: { ...aabBooks.translation, id: translationId },
    books: aabBooks.books,
    ...overrides,
  };
}

function makeChapterEntry(book: string, chapter: number): StoredChapterEntry {
  return {
    book,
    chapter,
    data: {
      numberOfVerses: 1,
      thisChapterAudioLinks: {},
      chapter: {
        number: chapter,
        content: [
          { type: "verse", number: 1, content: [`${book} ${chapter}`] },
        ],
        footnotes: [],
      },
    },
  };
}

describe("createIndexedDbTranslationStore()", () => {
  it("returns null where IndexedDB is unavailable, so callers can hide the feature", () => {
    // jsdom provides no IndexedDB, which is the same situation as server-side
    // rendering and browsers that block storage.
    expect(typeof indexedDB).toBe("undefined");
    expect(createIndexedDbTranslationStore()).toBeNull();
  });
});

describe("createInMemoryTranslationStore()", () => {
  it("round-trips a translation and its chapters", async () => {
    const store = createInMemoryTranslationStore();
    const record = makeRecord("AAB");

    await store.save(record, [
      makeChapterEntry("GEN", 1),
      makeChapterEntry("GEN", 2),
    ]);

    expect(await store.get("AAB")).toEqual(record);
    expect(await store.list()).toEqual([record]);
    expect((await store.getChapter("AAB", "GEN", 2))?.chapter.number).toBe(2);
    expect(await store.getChapter("AAB", "GEN", 3)).toBeNull();
    expect(await store.get("NIV")).toBeNull();
  });

  it("reports save progress", async () => {
    const store = createInMemoryTranslationStore();
    const progress: Array<[number, number]> = [];

    await store.save(makeRecord("AAB"), [makeChapterEntry("GEN", 1)], {
      onProgress: (saved, total) => progress.push([saved, total]),
    });

    expect(progress.at(-1)).toEqual([1, 1]);
  });

  it("replaces a previous copy instead of merging with it", async () => {
    const store = createInMemoryTranslationStore();
    await store.save(makeRecord("AAB"), [
      makeChapterEntry("GEN", 1),
      makeChapterEntry("GEN", 2),
    ]);

    await store.save(makeRecord("AAB", { sha256: "newer" }), [
      makeChapterEntry("GEN", 1),
    ]);

    expect((await store.get("AAB"))?.sha256).toBe("newer");
    // Chapter 2 came only from the older copy, so it must be gone.
    expect(await store.getChapter("AAB", "GEN", 2)).toBeNull();
  });

  it("rejects and stores nothing when the save is cancelled", async () => {
    const store = createInMemoryTranslationStore();
    const controller = new AbortController();
    controller.abort();

    await expect(
      store.save(makeRecord("AAB"), [makeChapterEntry("GEN", 1)], {
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(await store.get("AAB")).toBeNull();
    expect(await store.getChapter("AAB", "GEN", 1)).toBeNull();
  });

  it("leaves nothing behind when a save that replaces a copy is cancelled", async () => {
    const store = createInMemoryTranslationStore();
    await store.save(makeRecord("AAB"), [makeChapterEntry("GEN", 1)]);

    const controller = new AbortController();
    controller.abort();
    await expect(
      store.save(
        makeRecord("AAB", { sha256: "newer" }),
        [makeChapterEntry("GEN", 1)],
        { signal: controller.signal }
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    // A save always clears the old copy before writing the new one, so
    // cancelling an update costs the user the copy they had. That's the price of
    // never leaving a half-updated translation readable.
    expect(await store.get("AAB")).toBeNull();
  });

  it("deletes only the requested translation's chapters", async () => {
    const store = createInMemoryTranslationStore();
    await store.save(makeRecord("AAB"), [makeChapterEntry("GEN", 1)]);
    await store.save(makeRecord("NIV"), [makeChapterEntry("GEN", 1)]);

    await store.delete("AAB");

    expect(await store.get("AAB")).toBeNull();
    expect(await store.getChapter("AAB", "GEN", 1)).toBeNull();
    expect(await store.get("NIV")).not.toBeNull();
    expect(await store.getChapter("NIV", "GEN", 1)).not.toBeNull();
  });
});
