import {
  BOOK_ID_MAP,
  BOOK_SLUGS,
  createBibleDataManager,
  findClosestBookId,
  getBookId,
  getBookSlug,
  parseVerseReference,
  parseVerseReferences,
  type BibleDataManager,
  type BookId,
  type TranslationsCache,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  FreeUseBibleAPI,
  type TranslationBook,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  EXAMPLE_API_ENDPOINT,
  bsbBooks,
  createResponse,
  makeChapter,
  nivBooks,
  translations,
  type WebResponseMap,
} from "./testUtils/mockBibleApiData";
import type { Mock } from "vitest";

const ALT_ENDPOINT = "https://alt-two.example";

let webGetMock: Mock;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  webGetMock = vi.fn();
  globalThis.fetch = webGetMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setWebResponses(responses: WebResponseMap): void {
  webGetMock.mockImplementation((url: string) => {
    const response = responses[url];
    if (!response) {
      throw new Error(`No mocked response for ${url}`);
    }
    return Promise.resolve(response);
  });
}

function makeEndpointUrl(endpoint: string, path: string): string {
  return new URL(path, endpoint).href;
}

function createManager(
  endpoint: string = EXAMPLE_API_ENDPOINT
): BibleDataManager {
  return createBibleDataManager(new FreeUseBibleAPI(endpoint));
}

function createAltNivTranslation(): Translation {
  return {
    ...translations.translations[1]!,
    englishName: "NIV Alternate",
    listOfBooksApiLink: "/api/NIV/books.json",
  };
}

describe("createBibleDataManager", () => {
  it("exposes the underlying api instance", () => {
    const api = new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT);
    const manager = createBibleDataManager(api);

    expect(manager.api).toBe(api);
  });

  it("getTranslations() tracks endpoints and merges translations by ID", async () => {
    const altNiv = createAltNivTranslation();
    const altEsv: Translation = {
      ...translations.translations[0]!,
      id: "ESV",
      shortName: "ESV",
      englishName: "English Standard Version",
      listOfBooksApiLink: "/api/ESV/books.json",
    };

    const responses: WebResponseMap = {
      [makeEndpointUrl(
        EXAMPLE_API_ENDPOINT,
        "api/available_translations.json"
      )]: createResponse(translations),
      [makeEndpointUrl(ALT_ENDPOINT, "api/available_translations.json")]:
        createResponse({ translations: [altNiv, altEsv] }),
    };

    setWebResponses(responses);
    const manager = createManager();

    await manager.getTranslations();
    await manager.getTranslations(ALT_ENDPOINT);

    expect(manager.endpoints.value).toEqual([
      `${EXAMPLE_API_ENDPOINT}/`,
      `${ALT_ENDPOINT}/`,
    ]);

    const mergedById = new Map(
      manager.availableTranslations.value.map((translation) => [
        translation.id,
        translation,
      ])
    );

    expect(mergedById.get("NIV")?.englishName).toBe("NIV Alternate");
    expect(mergedById.get("AAB")?.id).toBe("AAB");
    expect(mergedById.get("ESV")?.id).toBe("ESV");
  });

  it("getTranslationBooks() fetches from the translation endpoint and caches by translation ID", async () => {
    const altNiv = createAltNivTranslation();
    const altNivBooks = {
      ...nivBooks,
      translation: altNiv,
    };

    const responses: WebResponseMap = {
      [makeEndpointUrl(ALT_ENDPOINT, "api/available_translations.json")]:
        createResponse({ translations: [altNiv] }),
      [makeEndpointUrl(ALT_ENDPOINT, "api/NIV/books.json")]:
        createResponse(altNivBooks),
    };

    setWebResponses(responses);
    const manager = createManager();
    await manager.getTranslations(ALT_ENDPOINT);

    const first = await manager.getTranslationBooks("NIV");
    const second = await manager.getTranslationBooks("NIV");

    expect(first).toEqual(altNivBooks);
    expect(second).toBe(first);
    expect(manager.translationBooks.value.get("NIV")).toEqual(altNivBooks);
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/books.json"),
      expect.anything()
    );
    expect(
      webGetMock.mock.calls.filter((call) =>
        String(call[0]).includes("/api/NIV/books.json")
      )
    ).toHaveLength(1);
  });

  it("getTranslationBookChapter() fetches chapter data using the translation endpoint", async () => {
    const altNiv = createAltNivTranslation();
    const altNivBooks = {
      ...nivBooks,
      translation: altNiv,
    };
    const chapter = {
      ...makeChapter(altNivBooks, "MAT", 1),
      translation: altNiv,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    };

    const responses: WebResponseMap = {
      [makeEndpointUrl(ALT_ENDPOINT, "api/available_translations.json")]:
        createResponse({ translations: [altNiv] }),
      [makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/1.json")]:
        createResponse(chapter),
    };

    setWebResponses(responses);
    const manager = createManager();
    await manager.getTranslations(ALT_ENDPOINT);

    const result = await manager.getTranslationBookChapter("NIV", "MAT", 1);

    expect(result.chapter.number).toBe(1);
    expect(result.translation.id).toBe("NIV");
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/1.json"),
      expect.anything()
    );
  });

  it("getNextChapter() and getPreviousChapter() use the chapter translation endpoint", async () => {
    const altNiv = createAltNivTranslation();
    const altNivBooks = {
      ...nivBooks,
      translation: altNiv,
    };
    const chapter1 = {
      ...makeChapter(altNivBooks, "MAT", 1),
      translation: altNiv,
      thisChapterLink: "/api/NIV/MAT/1.json",
      nextChapterApiLink: "/api/NIV/MAT/2.json",
      previousChapterApiLink: null,
    };
    const chapter2 = {
      ...makeChapter(altNivBooks, "MAT", 2),
      translation: altNiv,
      thisChapterLink: "/api/NIV/MAT/2.json",
      nextChapterApiLink: "/api/NIV/MAT/3.json",
      previousChapterApiLink: "/api/NIV/MAT/1.json",
    };

    const responses: WebResponseMap = {
      [makeEndpointUrl(ALT_ENDPOINT, "api/available_translations.json")]:
        createResponse({ translations: [altNiv] }),
      [makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/2.json")]:
        createResponse(chapter2),
      [makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/1.json")]:
        createResponse(chapter1),
      [makeEndpointUrl(EXAMPLE_API_ENDPOINT, "api/BSB/GEN/1.json")]:
        createResponse(makeChapter(bsbBooks, "GEN", 1)),
    };

    setWebResponses(responses);
    const manager = createManager();
    await manager.getTranslations(ALT_ENDPOINT);

    const next = await manager.getNextChapter(chapter1);
    const previous = await manager.getPreviousChapter(chapter2);

    expect(next?.chapter.number).toBe(2);
    expect(previous?.chapter.number).toBe(1);
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/2.json"),
      expect.anything()
    );
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/1.json"),
      expect.anything()
    );
  });

  it("buildTranslationId() returns the raw translation ID for default-endpoint translations", async () => {
    const responses: WebResponseMap = {
      [makeEndpointUrl(
        EXAMPLE_API_ENDPOINT,
        "api/available_translations.json"
      )]: createResponse(translations),
    };

    setWebResponses(responses);
    const manager = createManager();
    await manager.getTranslations();

    expect(manager.buildTranslationId("NIV")).toBe("NIV");
  });

  it("buildTranslationId() returns a books.json URL for non-default-endpoint translations", async () => {
    const altNiv = createAltNivTranslation();
    const responses: WebResponseMap = {
      [makeEndpointUrl(ALT_ENDPOINT, "api/available_translations.json")]:
        createResponse({ translations: [altNiv] }),
    };

    setWebResponses(responses);
    const manager = createManager();
    await manager.getTranslations(ALT_ENDPOINT);

    expect(manager.buildTranslationId("NIV")).toBe(
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/books.json")
    );
  });

  describe("translationsCache option", () => {
    function createTestCache(): TranslationsCache {
      const store = new Map<string, Promise<Translation[]>>();
      return {
        get: (endpoint) => store.get(endpoint),
        set: (endpoint, promise) => store.set(endpoint, promise),
        delete: (endpoint) => store.delete(endpoint),
      };
    }

    it("shares one fetch across separate managers that share a cache", async () => {
      setWebResponses({
        [makeEndpointUrl(
          EXAMPLE_API_ENDPOINT,
          "api/available_translations.json"
        )]: createResponse(translations),
      });

      const translationsCache = createTestCache();
      const managerA = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { translationsCache }
      );
      const managerB = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { translationsCache }
      );

      await managerA.getTranslations();
      await managerB.getTranslations();

      expect(webGetMock).toHaveBeenCalledTimes(1);
    });

    it("shares one in-flight fetch across managers racing on a cache miss", async () => {
      setWebResponses({
        [makeEndpointUrl(
          EXAMPLE_API_ENDPOINT,
          "api/available_translations.json"
        )]: createResponse(translations),
      });

      const translationsCache = createTestCache();
      const managerA = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { translationsCache }
      );
      const managerB = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { translationsCache }
      );

      await Promise.all([
        managerA.getTranslations(),
        managerB.getTranslations(),
      ]);

      expect(webGetMock).toHaveBeenCalledTimes(1);
    });

    it("refresh: true bypasses and evicts the cache", async () => {
      const updatedNiv = {
        ...translations.translations[1]!,
        sha256: "updated",
      };
      webGetMock
        .mockResolvedValueOnce(createResponse(translations))
        .mockResolvedValueOnce(
          createResponse({
            translations: [translations.translations[0]!, updatedNiv],
          })
        );

      const translationsCache = createTestCache();
      const manager = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { translationsCache }
      );

      await manager.getTranslations();
      const cachedAgain = await manager.getTranslations();
      expect(webGetMock).toHaveBeenCalledTimes(1);
      expect(cachedAgain.find((t) => t.id === "NIV")?.sha256).not.toBe(
        "updated"
      );

      const refreshed = await manager.getTranslations(undefined, {
        refresh: true,
      });
      expect(webGetMock).toHaveBeenCalledTimes(2);
      expect(refreshed.find((t) => t.id === "NIV")?.sha256).toBe("updated");
    });

    it("does not cache a failed fetch, so the next call retries", async () => {
      webGetMock
        .mockRejectedValueOnce(new Error("network down"))
        .mockResolvedValueOnce(createResponse(translations));

      const translationsCache = createTestCache();
      const manager = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { translationsCache }
      );

      await expect(manager.getTranslations()).rejects.toThrow("network down");

      const result = await manager.getTranslations();
      expect(result).toEqual(translations.translations);
      expect(webGetMock).toHaveBeenCalledTimes(2);
    });

    // Regression: a slow request's own `.catch` used to delete whatever the
    // cache currently held for that endpoint, not just its own (now stale)
    // entry. A `refresh: true` call that starts and finishes while the
    // original request is still hanging replaces the cache entry with a
    // fresh, valid one — the original request rejecting afterward must not
    // wipe that out.
    it("does not evict a fresher cache entry when a superseded request rejects later", async () => {
      function createDeferred<T>() {
        let resolve!: (value: T) => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      }

      const deferredA = createDeferred<ReturnType<typeof createResponse>>();
      const deferredB = createDeferred<ReturnType<typeof createResponse>>();
      webGetMock
        .mockImplementationOnce(() => deferredA.promise)
        .mockImplementationOnce(() => deferredB.promise);

      const translationsCache = createTestCache();
      const manager = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { translationsCache }
      );

      // Both calls run synchronously up to their own first `await`, so this
      // reproduces the exact race: A's fetch starts and hangs, then B's
      // `refresh: true` call supersedes it before A ever settles.
      const callA = manager.getTranslations();
      const callB = manager.getTranslations(undefined, { refresh: true });
      const normalizedEndpoint = manager.endpoints.value[0]!;

      deferredB.resolve(createResponse(translations));
      await callB;
      const cachedAfterB = translationsCache.get(normalizedEndpoint);
      expect(cachedAfterB).toBeDefined();

      deferredA.reject(new Error("stale request failed"));
      await expect(callA).rejects.toThrow("stale request failed");

      // B's entry must still be the current cache contents.
      expect(translationsCache.get(normalizedEndpoint)).toBe(cachedAfterB);
    });
  });
});

describe("parseVerseReference()", () => {
  const cases = [
    ["GEN 1:1", { book: "GEN", chapter: 1, verse: 1 }] as const,
    ["EXO 1:1", { book: "EXO", chapter: 1, verse: 1 }] as const,
    ["PSA 110:1", { book: "PSA", chapter: 110, verse: 1 }] as const,
    ["psalms 110:1", { book: "PSA", chapter: 110, verse: 1 }] as const,
    ["JHN 1:50", { book: "JHN", chapter: 1, verse: 50 }] as const,
    ["John 1:50", { book: "JHN", chapter: 1, verse: 50 }] as const,

    ["1CO 1:2", { book: "1CO", chapter: 1, verse: 2 }] as const,
    ["1 Corinthians 1:2", { book: "1CO", chapter: 1, verse: 2 }] as const,

    [
      "Gen.1.1-2.3",
      { book: "GEN", chapter: 1, verse: 1, endChapter: 2, endVerse: 3 },
    ] as const,
    ["Obad.1.11", { book: "OBA", chapter: 1, verse: 11 }] as const,
    [
      "Hab.3.8-15",
      { book: "HAB", chapter: 3, verse: 8, endVerse: 15 },
    ] as const,
    ["Hab.3", { book: "HAB", chapter: 3 }] as const,
    ["Hab.3-5", { book: "HAB", chapter: 3, endChapter: 5 }] as const,
    ["2Sam.15.8", { book: "2SA", chapter: 15, verse: 8 }] as const,
    [
      "1Kgs.1.31-32",
      { book: "1KI", chapter: 1, verse: 31, endVerse: 32 },
    ] as const,

    // verse-optional formats
    ["GEN 1", { book: "GEN", chapter: 1 }] as const,
    ["GEN 5-7", { book: "GEN", chapter: 5, endChapter: 7 }] as const,
    [
      "GEN 5:16-19",
      { book: "GEN", chapter: 5, verse: 16, endVerse: 19 },
    ] as const,
    [
      "GEN 1:1-2:10",
      { book: "GEN", chapter: 1, verse: 1, endChapter: 2, endVerse: 10 },
    ] as const,

    // em dash range separator
    ["GEN 5—7", { book: "GEN", chapter: 5, endChapter: 7 }] as const,
    [
      "GEN 5:16—19",
      { book: "GEN", chapter: 5, verse: 16, endVerse: 19 },
    ] as const,
    [
      "GEN 1:1—2:10",
      { book: "GEN", chapter: 1, verse: 1, endChapter: 2, endVerse: 10 },
    ] as const,
    [
      "Hab.3.8—15",
      { book: "HAB", chapter: 3, verse: 8, endVerse: 15 },
    ] as const,
  ];

  it.each(cases)("should parse %s", (input, expected) => {
    expect(parseVerseReference(input)).toEqual(expected);
  });

  const verseCases = [
    [
      "GEN 1:1 In the beginning, God created the Heavens and the Earth.",
      {
        book: "GEN",
        chapter: 1,
        verse: 1,
        content: "In the beginning, God created the Heavens and the Earth.",
      },
    ] as const,
    [
      "EXO 1:1 These are the names of the sons of Israel who came to Egypt with Jacob, each with his household:",
      {
        book: "EXO",
        chapter: 1,
        verse: 1,
        content:
          "These are the names of the sons of Israel who came to Egypt with Jacob, each with his household:",
      },
    ] as const,
    [
      "PSA 110:1 The Lord says to my Lord: \n“Sit at my right hand, \nuntil I make your enemies your footstool.”",
      {
        book: "PSA",
        chapter: 110,
        verse: 1,
        content:
          "The Lord says to my Lord: \n“Sit at my right hand, \nuntil I make your enemies your footstool.”",
      },
    ] as const,
    [
      "JHN 1:50 Jesus answered him, “Because I said to you, ‘I saw you under the fig tree,’ do you believe? You will see greater things than these.”",
      {
        book: "JHN",
        chapter: 1,
        verse: 50,
        content:
          "Jesus answered him, “Because I said to you, ‘I saw you under the fig tree,’ do you believe? You will see greater things than these.”",
      },
    ] as const,
  ];

  it.each(verseCases)(
    "should parse the reference from %s",
    (input, expected) => {
      expect(parseVerseReference(input)).toEqual(expected);
    }
  );
});

describe("parseVerseReferences()", () => {
  const cases = [
    ["GEN 1:1", { ref: { book: "GEN", chapter: 1, verse: 1 } }] as const,
    ["EXO 1:1", { ref: { book: "EXO", chapter: 1, verse: 1 } }] as const,
    ["PSA 110:1", { ref: { book: "PSA", chapter: 110, verse: 1 } }] as const,
    ["psalms 110:1", { ref: { book: "PSA", chapter: 110, verse: 1 } }] as const,
    ["JHN 1:50", { ref: { book: "JHN", chapter: 1, verse: 50 } }] as const,
    ["John 1:50", { ref: { book: "JHN", chapter: 1, verse: 50 } }] as const,

    ["1CO 1:2", { ref: { book: "1CO", chapter: 1, verse: 2 } }] as const,
    [
      "1 Corinthians 1:2",
      { ref: { book: "1CO", chapter: 1, verse: 2 } },
    ] as const,

    [
      "Gen.1.1-2.3",
      {
        ref: { book: "GEN", chapter: 1, verse: 1, endChapter: 2, endVerse: 3 },
      },
    ] as const,
    ["Obad.1.11", { ref: { book: "OBA", chapter: 1, verse: 11 } }] as const,
    [
      "Hab.3.8-15",
      { ref: { book: "HAB", chapter: 3, verse: 8, endVerse: 15 } },
    ] as const,
    ["Hab.3", { ref: { book: "HAB", chapter: 3 } }] as const,
    ["Hab.3-5", { ref: { book: "HAB", chapter: 3, endChapter: 5 } }] as const,
    ["2Sam.15.8", { ref: { book: "2SA", chapter: 15, verse: 8 } }] as const,
    [
      "1Kgs.1.31-32",
      { ref: { book: "1KI", chapter: 1, verse: 31, endVerse: 32 } },
    ] as const,

    // verse-optional formats
    ["GEN 1", { ref: { book: "GEN", chapter: 1 } }] as const,
    ["GEN 5-7", { ref: { book: "GEN", chapter: 5, endChapter: 7 } }] as const,
    [
      "GEN 5:16-19",
      { ref: { book: "GEN", chapter: 5, verse: 16, endVerse: 19 } },
    ] as const,
    [
      "GEN 1:1-2:10",
      {
        ref: { book: "GEN", chapter: 1, verse: 1, endChapter: 2, endVerse: 10 },
      },
    ] as const,

    // em dash range separator
    ["GEN 5—7", { ref: { book: "GEN", chapter: 5, endChapter: 7 } }] as const,
    [
      "GEN 5:16—19",
      { ref: { book: "GEN", chapter: 5, verse: 16, endVerse: 19 } },
    ] as const,
    [
      "GEN 1:1—2:10",
      {
        ref: { book: "GEN", chapter: 1, verse: 1, endChapter: 2, endVerse: 10 },
      },
    ] as const,
    [
      "Hab.3.8—15",
      { ref: { book: "HAB", chapter: 3, verse: 8, endVerse: 15 } },
    ] as const,
  ];

  it.each(cases)("should find %s", (input, expected) => {
    expect(parseVerseReferences(input)).toContainEqual(
      expect.objectContaining(expected)
    );
  });

  it("should find a single reference", () => {
    expect(parseVerseReferences("This is GEN 1:1.")).toEqual([
      { ref: { book: "GEN", chapter: 1, verse: 1 }, start: 8, end: 15 },
    ]);
  });

  it("should find multiple chapter-only references", () => {
    expect(parseVerseReferences("This is GEN 5 and this is GEN 40")).toEqual([
      { ref: { book: "GEN", chapter: 5 }, start: 8, end: 13 },
      { ref: { book: "GEN", chapter: 40 }, start: 26, end: 32 },
    ]);
  });

  it("should find multiple references with ranges", () => {
    expect(parseVerseReferences("This is MAT 1:1-3 and John 3:16")).toEqual([
      {
        ref: { book: "MAT", chapter: 1, verse: 1, endVerse: 3 },
        start: 8,
        end: 17,
      },
      { ref: { book: "JHN", chapter: 3, verse: 16 }, start: 22, end: 31 },
    ]);
  });

  it("should find references with em dash ranges", () => {
    expect(parseVerseReferences("See MAT 1:1—3 and also John 3:16—18")).toEqual(
      [
        {
          ref: { book: "MAT", chapter: 1, verse: 1, endVerse: 3 },
          start: 4,
          end: 13,
        },
        {
          ref: { book: "JHN", chapter: 3, verse: 16, endVerse: 18 },
          start: 23,
          end: 35,
        },
      ]
    );
  });

  it("should find numbered books when preceded by other words", () => {
    expect(parseVerseReferences("See 1 Corinthians 13:4 for love")).toEqual([
      {
        ref: { book: "1CO", chapter: 13, verse: 4 },
        start: 4,
        end: 22,
      },
    ]);
    expect(parseVerseReferences("See 2 Corinthians 5:17")).toEqual([
      {
        ref: { book: "2CO", chapter: 5, verse: 17 },
        start: 4,
        end: 22,
      },
    ]);
    expect(parseVerseReferences("See 1 John 3:16 and 1 Kings 1:1")).toEqual([
      {
        ref: { book: "1JN", chapter: 3, verse: 16 },
        start: 4,
        end: 15,
      },
      {
        ref: { book: "1KI", chapter: 1, verse: 1 },
        start: 20,
        end: 31,
      },
    ]);
    expect(parseVerseReferences("See 1CO 1:2")).toEqual([
      {
        ref: { book: "1CO", chapter: 1, verse: 2 },
        start: 4,
        end: 11,
      },
    ]);
  });

  it("should not treat 'Song of …' phrases as Song of Solomon", () => {
    expect(parseVerseReferences("the Song of Moses 2:1")).toEqual([]);
    expect(parseVerseReferences("See Song of Mary 1:46")).toEqual([]);
    expect(getBookId("song of moses")).toBeNull();
    expect(getBookId("Song of Mary")).toBeNull();
  });

  it("should accept title-cased 'Of' in Song of Solomon", () => {
    expect(parseVerseReferences("Song Of Solomon 2:1")).toContainEqual(
      expect.objectContaining({
        ref: expect.objectContaining({ book: "SNG", chapter: 2, verse: 1 }),
      })
    );
  });
});

/**
 * All 66 Protestant-canon books with their USFM IDs and common English names.
 */
const PROTESTANT_CANON: ReadonlyArray<{ id: BookId; name: string }> = [
  { id: "GEN", name: "Genesis" },
  { id: "EXO", name: "Exodus" },
  { id: "LEV", name: "Leviticus" },
  { id: "NUM", name: "Numbers" },
  { id: "DEU", name: "Deuteronomy" },
  { id: "JOS", name: "Joshua" },
  { id: "JDG", name: "Judges" },
  { id: "RUT", name: "Ruth" },
  { id: "1SA", name: "1 Samuel" },
  { id: "2SA", name: "2 Samuel" },
  { id: "1KI", name: "1 Kings" },
  { id: "2KI", name: "2 Kings" },
  { id: "1CH", name: "1 Chronicles" },
  { id: "2CH", name: "2 Chronicles" },
  { id: "EZR", name: "Ezra" },
  { id: "NEH", name: "Nehemiah" },
  { id: "EST", name: "Esther" },
  { id: "JOB", name: "Job" },
  { id: "PSA", name: "Psalms" },
  { id: "PRO", name: "Proverbs" },
  { id: "ECC", name: "Ecclesiastes" },
  { id: "SNG", name: "Song of Solomon" },
  { id: "ISA", name: "Isaiah" },
  { id: "JER", name: "Jeremiah" },
  { id: "LAM", name: "Lamentations" },
  { id: "EZK", name: "Ezekiel" },
  { id: "DAN", name: "Daniel" },
  { id: "HOS", name: "Hosea" },
  { id: "JOL", name: "Joel" },
  { id: "AMO", name: "Amos" },
  { id: "OBA", name: "Obadiah" },
  { id: "JON", name: "Jonah" },
  { id: "MIC", name: "Micah" },
  { id: "NAM", name: "Nahum" },
  { id: "HAB", name: "Habakkuk" },
  { id: "ZEP", name: "Zephaniah" },
  { id: "HAG", name: "Haggai" },
  { id: "ZEC", name: "Zechariah" },
  { id: "MAL", name: "Malachi" },
  { id: "MAT", name: "Matthew" },
  { id: "MRK", name: "Mark" },
  { id: "LUK", name: "Luke" },
  { id: "JHN", name: "John" },
  { id: "ACT", name: "Acts" },
  { id: "ROM", name: "Romans" },
  { id: "1CO", name: "1 Corinthians" },
  { id: "2CO", name: "2 Corinthians" },
  { id: "GAL", name: "Galatians" },
  { id: "EPH", name: "Ephesians" },
  { id: "PHP", name: "Philippians" },
  { id: "COL", name: "Colossians" },
  { id: "1TH", name: "1 Thessalonians" },
  { id: "2TH", name: "2 Thessalonians" },
  { id: "1TI", name: "1 Timothy" },
  { id: "2TI", name: "2 Timothy" },
  { id: "TIT", name: "Titus" },
  { id: "PHM", name: "Philemon" },
  { id: "HEB", name: "Hebrews" },
  { id: "JAS", name: "James" },
  { id: "1PE", name: "1 Peter" },
  { id: "2PE", name: "2 Peter" },
  { id: "1JN", name: "1 John" },
  { id: "2JN", name: "2 John" },
  { id: "3JN", name: "3 John" },
  { id: "JUD", name: "Jude" },
  { id: "REV", name: "Revelation" },
];

describe("all 66 Protestant-canon books", () => {
  it("lists exactly 66 books with unique IDs", () => {
    expect(PROTESTANT_CANON).toHaveLength(66);
    expect(new Set(PROTESTANT_CANON.map((b) => b.id)).size).toBe(66);
  });

  describe("getBookId()", () => {
    it.each(PROTESTANT_CANON)("resolves book ID $id", ({ id }) => {
      expect(getBookId(id)).toBe(id);
    });

    it.each(PROTESTANT_CANON)(
      "resolves English name $name → $id",
      ({ id, name }) => {
        expect(getBookId(name)).toBe(id);
      }
    );
  });

  describe("parseVerseReference() by book ID", () => {
    it.each(PROTESTANT_CANON)("parses standalone $id 1:1", ({ id }) => {
      expect(parseVerseReference(`${id} 1:1`)).toEqual(
        expect.objectContaining({ book: id, chapter: 1, verse: 1 })
      );
    });
  });

  describe("parseVerseReference() by English name", () => {
    it.each(PROTESTANT_CANON)("parses standalone $name 1:1", ({ id, name }) => {
      expect(parseVerseReference(`${name} 1:1`)).toEqual(
        expect.objectContaining({ book: id, chapter: 1, verse: 1 })
      );
    });
  });

  describe("parseVerseReferences() by book ID", () => {
    it.each(PROTESTANT_CANON)("finds standalone $id 1:1", ({ id }) => {
      expect(parseVerseReferences(`${id} 1:1`)).toContainEqual(
        expect.objectContaining({
          ref: expect.objectContaining({ book: id, chapter: 1, verse: 1 }),
        })
      );
    });

    it.each(PROTESTANT_CANON)("finds mid-sentence $id 1:1", ({ id }) => {
      expect(parseVerseReferences(`See ${id} 1:1 for context`)).toContainEqual(
        expect.objectContaining({
          ref: expect.objectContaining({ book: id, chapter: 1, verse: 1 }),
        })
      );
    });
  });

  describe("parseVerseReferences() by English name", () => {
    it.each(PROTESTANT_CANON)("finds standalone $name 1:1", ({ id, name }) => {
      expect(parseVerseReferences(`${name} 1:1`)).toContainEqual(
        expect.objectContaining({
          ref: expect.objectContaining({ book: id, chapter: 1, verse: 1 }),
        })
      );
    });

    it.each(PROTESTANT_CANON)(
      "finds mid-sentence $name 1:1",
      ({ id, name }) => {
        expect(
          parseVerseReferences(`See ${name} 1:1 for context`)
        ).toContainEqual(
          expect.objectContaining({
            ref: expect.objectContaining({ book: id, chapter: 1, verse: 1 }),
          })
        );
      }
    );
  });

  describe("with localized translation books", () => {
    const spaBooks = [
      {
        id: "GEN",
        name: "Génesis",
        commonName: "Génesis",
        title: null,
        order: 1,
        numberOfChapters: 50,
        firstChapterNumber: 1,
        totalNumberOfVerses: 1533,
      },
      {
        id: "EXO",
        name: "Éxodo",
        commonName: "Éxodo",
        title: null,
        order: 2,
        numberOfChapters: 40,
        firstChapterNumber: 1,
        totalNumberOfVerses: 1213,
      },
      {
        id: "EZR",
        name: "Esdras",
        commonName: "Esdras",
        title: null,
        order: 15,
        numberOfChapters: 10,
        firstChapterNumber: 1,
        totalNumberOfVerses: 280,
      },
      {
        id: "NEH",
        name: "Nehemías",
        commonName: "Nehemías",
        title: null,
        order: 16,
        numberOfChapters: 13,
        firstChapterNumber: 1,
        totalNumberOfVerses: 406,
      },
      {
        id: "1CO",
        name: "1 Corintios",
        commonName: "1 Corintios",
        title: null,
        order: 46,
        numberOfChapters: 16,
        firstChapterNumber: 1,
        totalNumberOfVerses: 437,
      },
      {
        id: "PHP",
        name: "Filipenses",
        commonName: "Filipenses",
        title: null,
        order: 50,
        numberOfChapters: 4,
        firstChapterNumber: 1,
        totalNumberOfVerses: 104,
      },
      {
        id: "PHM",
        name: "Filemon",
        commonName: "Filemon",
        title: null,
        order: 57,
        numberOfChapters: 1,
        firstChapterNumber: 1,
        totalNumberOfVerses: 25,
      },
    ] as TranslationBook[];

    it("matches an exact localized book name (Esdras → EZR)", () => {
      expect(parseVerseReference("Esdras 3", spaBooks)).toEqual({
        book: "EZR",
        chapter: 3,
      });
      expect(parseVerseReference("Esdras 3:1", spaBooks)).toEqual({
        book: "EZR",
        chapter: 3,
        verse: 1,
      });
      expect(parseVerseReference("Esdras 3:1-5", spaBooks)).toEqual({
        book: "EZR",
        chapter: 3,
        verse: 1,
        endVerse: 5,
      });
      expect(parseVerseReference("Esdras 1:1-2:3", spaBooks)).toEqual({
        book: "EZR",
        chapter: 1,
        verse: 1,
        endChapter: 2,
        endVerse: 3,
      });
    });

    it("finds a localized name mid-sentence", () => {
      expect(
        parseVerseReferences("Lee Esdras 3 primero", spaBooks)
      ).toContainEqual(
        expect.objectContaining({
          ref: { book: "EZR", chapter: 3 },
        })
      );
      expect(
        parseVerseReferences("See Esdras 3:1 and also John 1:1", spaBooks)
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ref: { book: "EZR", chapter: 3, verse: 1 },
          }),
          expect.objectContaining({
            ref: { book: "JHN", chapter: 1, verse: 1 },
          }),
        ])
      );
    });

    it("matches accented localized book names in the prose scanner", () => {
      expect(parseVerseReferences("Génesis 3", spaBooks)).toContainEqual(
        expect.objectContaining({
          ref: { book: "GEN", chapter: 3 },
        })
      );
      expect(
        parseVerseReferences("Lee Éxodo 2 conmigo", spaBooks)
      ).toContainEqual(
        expect.objectContaining({
          ref: { book: "EXO", chapter: 2 },
        })
      );
      expect(parseVerseReferences("Ver Nehemías 1:5", spaBooks)).toContainEqual(
        expect.objectContaining({
          ref: { book: "NEH", chapter: 1, verse: 5 },
        })
      );
      expect(parseVerseReference("Génesis 3:1", spaBooks)).toEqual({
        book: "GEN",
        chapter: 3,
        verse: 1,
      });
    });

    it("matches localized names case-insensitively", () => {
      expect(parseVerseReference("esdras 3", spaBooks)).toEqual({
        book: "EZR",
        chapter: 3,
      });
      expect(parseVerseReference("ESDRAS 3:1", spaBooks)).toEqual({
        book: "EZR",
        chapter: 3,
        verse: 1,
      });
    });

    it("does not unique-prefix expand short tokens when scanning prose", () => {
      // Prefix matching belongs in the deliberate single-reference parser, not
      // free-text scanning — otherwise "Is 3" becomes Isaiah, "So 3" Song, etc.
      expect(parseVerseReferences("See Esd 3 for context", spaBooks)).toEqual(
        []
      );
      expect(
        parseVerseReferences("See Filip 2:1 for context", spaBooks)
      ).toEqual([]);
      // Exact full names still match.
      expect(
        parseVerseReferences("See Filipenses 2:1 for context", spaBooks)
      ).toContainEqual(
        expect.objectContaining({
          ref: { book: "PHP", chapter: 2, verse: 1 },
        })
      );
    });

    it("does not treat ordinary short English words as book abbreviations", () => {
      // These match unique English prefixes only if we reintroduce "name starts
      // with token" matching — they must stay unlinked in chat/footnotes.
      const ordinary = [
        "Is 3 enough for everyone?",
        "So 3 people showed up",
        "Am 3 sure about this",
        "Ho 1 waited",
        "Ru 2 left early",
      ];
      for (const text of ordinary) {
        expect(parseVerseReferences(text, spaBooks)).toEqual([]);
        expect(parseVerseReferences(text)).toEqual([]);
      }
    });

    it("matches numbered localized book names", () => {
      expect(parseVerseReference("1 Corintios 13:4", spaBooks)).toEqual({
        book: "1CO",
        chapter: 13,
        verse: 4,
      });
      expect(
        parseVerseReferences("See 1 Corintios 13:4 for love", spaBooks)
      ).toContainEqual(
        expect.objectContaining({
          ref: { book: "1CO", chapter: 13, verse: 4 },
        })
      );
    });

    it("falls back to English when the localized list has no match", () => {
      expect(parseVerseReference("John 3:16", spaBooks)).toEqual({
        book: "JHN",
        chapter: 3,
        verse: 16,
      });
      expect(parseVerseReference("Ezra 3", spaBooks)).toEqual({
        book: "EZR",
        chapter: 3,
      });
    });

    it("falls back to English when books are omitted or empty", () => {
      expect(parseVerseReference("John 3:16")).toEqual({
        book: "JHN",
        chapter: 3,
        verse: 16,
      });
      expect(parseVerseReference("John 3:16", [])).toEqual({
        book: "JHN",
        chapter: 3,
        verse: 16,
      });
      // Localized-only names need the books list to resolve to a real id.
      // parseVerseReference keeps the raw token when unresolved; the multi-ref
      // scanner rejects unknown names.
      expect(parseVerseReference("Esdras 3")).toEqual({
        book: "Esdras",
        chapter: 3,
      });
      expect(parseVerseReferences("Esdras 3")).toEqual([]);
    });

    it("matches by book id when the listed common name differs", () => {
      expect(parseVerseReference("EZR 3", spaBooks)).toEqual({
        book: "EZR",
        chapter: 3,
      });
    });

    it("returns no mid-sentence hits for fully unknown names", () => {
      expect(
        parseVerseReferences("See Nopeon 1 for context", spaBooks)
      ).toEqual([]);
    });
  });
});

describe("getBookId()", () => {
  it("should return the book ID", () => {
    expect(getBookId("GEN")).toBe("GEN");
    expect(getBookId("EXO")).toBe("EXO");

    expect(getBookId("PSA")).toBe("PSA");
    expect(getBookId("Psalms")).toBe("PSA");

    expect(getBookId("JHN")).toBe("JHN");
    expect(getBookId("John")).toBe("JHN");

    expect(getBookId("1CH")).toBe("1CH");
    expect(getBookId("1 chronicles")).toBe("1CH");
    expect(getBookId("1 chron")).toBe("1CH");
    expect(getBookId("1Kgs")).toBe("1KI");
    expect(getBookId("2Kgs")).toBe("2KI");
    expect(getBookId("1Chr")).toBe("1CH");
    expect(getBookId("2Chr")).toBe("2CH");

    expect(getBookId("Pr")).toBe("PRO");
    expect(getBookId("Ps")).toBe("PSA");
    expect(getBookId("Song")).toBe("SNG");
    expect(getBookId("Eccl")).toBe("ECC");
    expect(getBookId("1Pet")).toBe("1PE");
    expect(getBookId("2Pet")).toBe("2PE");
    expect(getBookId("1Jn")).toBe("1JN");
    expect(getBookId("2Jn")).toBe("2JN");
    expect(getBookId("3Jn")).toBe("3JN");

    expect(getBookId("Ezek")).toBe("EZK");
    expect(getBookId("Nah")).toBe("NAM");
    expect(getBookId("Phil")).toBe("PHP");
    expect(getBookId("Phlm")).toBe("PHM");
  });

  it("resolves hyphenated URL slugs (path-based routing)", () => {
    expect(getBookId("genesis")).toBe("GEN");
    expect(getBookId("song-of-solomon")).toBe("SNG");
    expect(getBookId("1-kings")).toBe("1KI");
    expect(getBookId("1-corinthians")).toBe("1CO");
  });
});

describe("getBookSlug()", () => {
  it("returns the canonical URL slug for a book", () => {
    expect(getBookSlug("GEN")).toBe("genesis");
    expect(getBookSlug("SNG")).toBe("song-of-solomon");
    expect(getBookSlug("1KI")).toBe("1-kings");
  });

  it("round-trips through getBookId", () => {
    expect(getBookId(getBookSlug("REV"))).toBe("REV");
    expect(getBookId(getBookSlug("1CO"))).toBe("1CO");
  });

  // Load-bearing for SSR routing, not just a tidiness check.
  // `legacyReadingUrlRedirect` 301s any reading path that differs from
  // `buildReadingPath` of what it resolved to, and that path is built from
  // `getBookSlug`. If a slug failed to resolve back to its own book, the
  // redirect target would itself be non-canonical and the server would
  // redirect it forever. The apocrypha are the ones to watch: they only got
  // `BOOK_ID_MAP` entries in 6e6e7b60, and their slugs are bare USFM codes.
  it("resolves every book's own slug back to that book", () => {
    for (const [bookId, slug] of Object.entries(BOOK_SLUGS)) {
      expect({ slug, id: getBookId(slug) }).toEqual({ slug, id: bookId });
    }
  });

  it("resolves spelled-out apocrypha names that collide with a shorter book's prefix", () => {
    // Without explicit entries these fall through to the `startsWith` scan
    // and land on Jude ("jud") and Ecclesiastes ("ecc").
    expect(getBookId("judith")).toBe("JDT");
    expect(getBookId("ecclesiasticus")).toBe("SIR");
  });

  it("falls back to a lowercased version of an unrecognized id instead of returning undefined", () => {
    // Callers on the legacy-URL fallback path (an old `?book=` link with a
    // value that isn't a real book) pass an unvalidated string through as if
    // it were a BookId; this must never surface "undefined" in a URL path.
    expect(getBookSlug("NOTABOOK" as BookId)).toBe("notabook");
  });
});

describe("findClosestBookId()", () => {
  it("accepts a close typo of a book slug", () => {
    // Doesn't share getBookId's "gen"/"genesis" alias prefixes, so this only
    // resolves through the fuzzy fallback.
    expect(findClosestBookId("senesis")).toBe("GEN");
  });

  it("accepts a close typo of a multi-word slug", () => {
    expect(findClosestBookId("song-of-solomen")).toBe("SNG");
  });

  it("is case-insensitive and ignores whitespace/hyphens like getBookId", () => {
    expect(findClosestBookId("Senesis")).toBe("GEN");
  });

  it("rejects a string too dissimilar from any book", () => {
    expect(findClosestBookId("notabook")).toBeNull();
    expect(findClosestBookId("xyzabc123")).toBeNull();
  });

  it("rejects strings too short to judge confidently", () => {
    expect(findClosestBookId("ab")).toBeNull();
  });

  it("returns null instead of getBookId already having a real exact/prefix match", () => {
    // findClosestBookId is only ever consulted as a fallback after getBookId
    // fails, but it should still behave sanely (return the real match) if
    // called directly on an exact name.
    expect(findClosestBookId("genesis")).toBe("GEN");
  });

  it("every BookId has a slug that round-trips through findClosestBookId", () => {
    for (const bookId of BOOK_ID_MAP.values()) {
      const slug = BOOK_SLUGS[bookId];
      expect(findClosestBookId(slug)).toBe(bookId);
    }
  });

  it("every slug maps to a book ID", () => {
    for (const bookId of Object.keys(BOOK_SLUGS) as BookId[]) {
      expect(getBookId(bookId)).toBe(bookId);
    }
  });
});
