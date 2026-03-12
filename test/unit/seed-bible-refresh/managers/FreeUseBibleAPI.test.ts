import {
  FreeUseBibleAPI,
  type TranslationBookChapter,
} from "@packages/seed-bible-refresh/seed-bible/managers/FreeUseBibleAPI";

type WebResponse<T> = {
  status: number;
  statusText: string;
  data: Promise<T>;
};

describe("FreeUseBibleAPI", () => {
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

  function createResponse<T>(
    payload: T,
    status: number = 200,
    statusText: string = "OK"
  ): WebResponse<T> {
    return {
      status,
      statusText,
      data: Promise.resolve(payload),
    };
  }

  it("fetches available translations", async () => {
    const payload = { translations: [{ id: "eng_kjv" }] };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI();
    const result = await api.getAvailableTranslations();

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledTimes(1);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://bible.helloao.org/api/available_translations.json"
    );
  });

  it("uses endpoint override for available translations", async () => {
    const payload = { translations: [{ id: "eng_kjv" }] };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example");
    const result = await api.getAvailableTranslations(
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://override.example/api/available_translations.json"
    );
  });

  it("encodes translation IDs when fetching books", async () => {
    const payload = { translation: { id: "ESV" }, books: [] };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://example.com/");
    const result = await api.getTranslationBooks("eng usfm/esv");

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://example.com/api/eng%20usfm%2Fesv/books.json"
    );
  });

  it("uses endpoint override for translation books", async () => {
    const payload = { translation: { id: "NIV" }, books: [] };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example");
    const result = await api.getTranslationBooks(
      "NIV",
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://override.example/api/NIV/books.json"
    );
  });

  it("encodes translation, book, and chapter when fetching a chapter", async () => {
    const payload = {
      chapter: { number: 1, content: [], footnotes: [] },
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://example.com");
    const result = await api.getTranslationBookChapter(
      "eng/esv",
      "1 John",
      "1:2"
    );

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://example.com/api/eng%2Fesv/1%20John/1%3A2.json"
    );
  });

  it("uses endpoint override for chapter requests", async () => {
    const payload = {
      chapter: { number: 2, content: [], footnotes: [] },
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example");
    const result = await api.getTranslationBookChapter(
      "BSB",
      "GEN",
      2,
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://override.example/api/BSB/GEN/2.json"
    );
  });

  it("returns null for next chapter when no link is present", async () => {
    const api = new FreeUseBibleAPI();
    const chapter = { nextChapterApiLink: null } as TranslationBookChapter;

    const result = await api.getNextChapter(chapter);

    expect(result).toBeNull();
    expect(webGetMock).not.toHaveBeenCalled();
  });

  it("uses endpoint override for next chapter links", async () => {
    const payload = {
      chapter: { number: 3, content: [], footnotes: [] },
      nextChapterApiLink: null,
      previousChapterApiLink: "/api/BSB/GEN/2.json",
    };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example");
    const chapter = {
      nextChapterApiLink: "/api/BSB/GEN/3.json",
    } as TranslationBookChapter;

    const result = await api.getNextChapter(
      chapter,
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://override.example/api/BSB/GEN/3.json"
    );
  });

  it("returns null for previous chapter when no link is present", async () => {
    const api = new FreeUseBibleAPI();
    const chapter = { previousChapterApiLink: null } as TranslationBookChapter;

    const result = await api.getPreviousChapter(chapter);

    expect(result).toBeNull();
    expect(webGetMock).not.toHaveBeenCalled();
  });

  it("uses endpoint override for previous chapter links", async () => {
    const payload = {
      chapter: { number: 1, content: [], footnotes: [] },
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      previousChapterApiLink: null,
    };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://default.example");
    const chapter = {
      previousChapterApiLink: "/api/BSB/GEN/1.json",
    } as TranslationBookChapter;

    const result = await api.getPreviousChapter(
      chapter,
      "https://override.example"
    );

    expect(result).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledWith(
      "https://override.example/api/BSB/GEN/1.json"
    );
  });

  it("caches in-flight requests by URL", async () => {
    const payload = { translations: [{ id: "eng_kjv" }] };
    webGetMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://example.com");
    const first = api.getAvailableTranslations();
    const second = api.getAvailableTranslations();

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual(payload);
    expect(secondResult).toEqual(payload);
    expect(webGetMock).toHaveBeenCalledTimes(1);
  });

  it("throws on non-2xx responses and clears cache so retries re-request", async () => {
    webGetMock
      .mockResolvedValueOnce(
        createResponse({ error: true }, 500, "Server Error")
      )
      .mockResolvedValueOnce(createResponse({ translations: [] }));

    const api = new FreeUseBibleAPI("https://example.com");

    await expect(api.getAvailableTranslations()).rejects.toThrow(
      "Failed request to https://example.com/api/available_translations.json. Status: 500 Server Error"
    );

    const retry = await api.getAvailableTranslations();

    expect(retry).toEqual({ translations: [] });
    expect(webGetMock).toHaveBeenCalledTimes(2);
    expect(webGetMock).toHaveBeenNthCalledWith(
      1,
      "https://example.com/api/available_translations.json"
    );
    expect(webGetMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/api/available_translations.json"
    );
  });
});
