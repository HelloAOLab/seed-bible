import {
  createBibleDataManager,
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
  it("defaults endpoints to the helloao endpoint", () => {
    const manager = createBibleDataManager();

    expect(manager.endpoints.value).toEqual(["https://bible.helloao.org/"]);
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
