import {
  FreeUseBibleAPI,
  type TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { Mock } from "vitest";

describe("FreeUseBibleAPI", () => {
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
  });

  function createResponse<T>(
    payload: T,
    status: number = 200,
    statusText: string = "OK"
  ): Pick<Response, "status" | "statusText" | "json"> {
    return {
      status,
      statusText,
      json: () => Promise.resolve(payload),
    };
  }

  it("fetches available translations", async () => {
    const payload = { translations: [{ id: "eng_kjv" }] };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI();
    const result = await api.getAvailableTranslations();

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://vmfnri.helloao.org/api/available_translations.json"
    );
  });

  it("uses endpoint override for available translations", async () => {
    const payload = { translations: [{ id: "eng_kjv" }] };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example/");
    const result = await api.getAvailableTranslations(
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.example/api/available_translations.json"
    );
  });

  it("encodes translation IDs when fetching books", async () => {
    const payload = { translation: { id: "ESV" }, books: [] };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://example.com/");
    const result = await api.getTranslationBooks("eng usfm/esv");

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/eng%20usfm%2Fesv/books.json"
    );
  });

  it("uses endpoint override for translation books", async () => {
    const payload = { translation: { id: "NIV" }, books: [] };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example/");
    const result = await api.getTranslationBooks(
      "NIV",
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.example/api/NIV/books.json"
    );
  });

  it("encodes translation, book, and chapter when fetching a chapter", async () => {
    const payload = {
      chapter: { number: 1, content: [], footnotes: [] },
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://example.com/");
    const result = await api.getTranslationBookChapter(
      "eng/esv",
      "1 John",
      "1:2"
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/eng%2Fesv/1%20John/1%3A2.json"
    );
  });

  it("uses endpoint override for chapter requests", async () => {
    const payload = {
      chapter: { number: 2, content: [], footnotes: [] },
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example/");
    const result = await api.getTranslationBookChapter(
      "BSB",
      "GEN",
      2,
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.example/api/BSB/GEN/2.json"
    );
  });

  it("returns null for next chapter when no link is present", async () => {
    const api = new FreeUseBibleAPI();
    const chapter = { nextChapterApiLink: null } as TranslationBookChapter;

    const result = await api.getNextChapter(chapter);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses endpoint override for next chapter links", async () => {
    const payload = {
      chapter: { number: 3, content: [], footnotes: [] },
      nextChapterApiLink: null,
      previousChapterApiLink: "/api/BSB/GEN/2.json",
    };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example/");
    const chapter = {
      nextChapterApiLink: "/api/BSB/GEN/3.json",
    } as TranslationBookChapter;

    const result = await api.getNextChapter(
      chapter,
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.example/api/BSB/GEN/3.json"
    );
  });

  it("returns null for previous chapter when no link is present", async () => {
    const api = new FreeUseBibleAPI();
    const chapter = { previousChapterApiLink: null } as TranslationBookChapter;

    const result = await api.getPreviousChapter(chapter);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses endpoint override for previous chapter links", async () => {
    const payload = {
      chapter: { number: 1, content: [], footnotes: [] },
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      previousChapterApiLink: null,
    };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example/");
    const chapter = {
      previousChapterApiLink: "/api/BSB/GEN/1.json",
    } as TranslationBookChapter;

    const result = await api.getPreviousChapter(
      chapter,
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.example/api/BSB/GEN/1.json"
    );
  });

  it("supports endpoint override with custom paths", async () => {
    const payload = {
      chapter: { number: 1, content: [], footnotes: [] },
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      previousChapterApiLink: null,
    };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example/");
    const chapter = {
      // The API link is always the entire path
      previousChapterApiLink: "/abc/def/api/BSB/GEN/1.json",
    } as TranslationBookChapter;

    const result = await api.getPreviousChapter(
      chapter,
      "https://override.example/abc/def/"
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.example/abc/def/api/BSB/GEN/1.json"
    );
  });

  it("caches in-flight requests by URL", async () => {
    const payload = { translations: [{ id: "eng_kjv" }] };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://example.com/");
    const first = api.getAvailableTranslations();
    const second = api.getAvailableTranslations();

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual(payload);
    expect(secondResult).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on non-2xx responses and clears cache so retries re-request", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse({ error: true }, 500, "Server Error")
      )
      .mockResolvedValueOnce(createResponse({ translations: [] }));

    const api = new FreeUseBibleAPI("https://example.com/");

    await expect(api.getAvailableTranslations()).rejects.toThrow(
      "Failed request to https://example.com/api/available_translations.json. Status: 500 Server Error"
    );

    const retry = await api.getAvailableTranslations();

    expect(retry).toEqual({ translations: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.com/api/available_translations.json"
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/api/available_translations.json"
    );
  });
});
