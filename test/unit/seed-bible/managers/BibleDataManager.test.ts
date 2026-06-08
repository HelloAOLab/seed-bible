import {
  createBibleDataManager,
  getBookId,
  parseVerseReference,
  parseVerseReferences,
  type BibleDataManager,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
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

const ALT_ENDPOINT = "https://alt-two.example";

let webGetMock: jest.Mock;

beforeEach(() => {
  webGetMock = jest.fn();
  (globalThis as any).web = {
    get: webGetMock,
  };
});

afterEach(() => {
  delete (globalThis as any).web;
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
  it("defaults endpoints to the private helloao endpoint", () => {
    const manager = createBibleDataManager();

    expect(manager.endpoints.value).toEqual(["https://vmfnri.helloao.org/"]);
    expect(manager.availableTranslations.value).toEqual([]);
    expect(manager.translationBooks.value.size).toBe(0);
  });

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
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/books.json")
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
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/1.json")
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
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/2.json")
    );
    expect(webGetMock).toHaveBeenCalledWith(
      makeEndpointUrl(ALT_ENDPOINT, "api/NIV/MAT/1.json")
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
});
