import {
  FREE_USE_BIBLE_API_ENDPOINT,
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

    const api = new FreeUseBibleAPI(FREE_USE_BIBLE_API_ENDPOINT);
    const result = await api.getAvailableTranslations();

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bible.helloao.org/api/available_translations.json",
      expect.anything()
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
      "https://override.example/api/available_translations.json",
      expect.anything()
    );
  });

  it("encodes translation IDs when fetching books", async () => {
    const payload = { translation: { id: "ESV" }, books: [] };
    fetchMock.mockResolvedValue(createResponse(payload));

    const api = new FreeUseBibleAPI("https://example.com/");
    const result = await api.getTranslationBooks("eng usfm/esv");

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/eng%20usfm%2Fesv/books.json",
      expect.anything()
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
      "https://override.example/api/NIV/books.json",
      expect.anything()
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
      "https://example.com/api/eng%2Fesv/1%20John/1%3A2.json",
      expect.anything()
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
      "https://override.example/api/BSB/GEN/2.json",
      expect.anything()
    );
  });

  it("returns null for next chapter when no link is present", async () => {
    const api = new FreeUseBibleAPI(FREE_USE_BIBLE_API_ENDPOINT);
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
      "https://override.example/api/BSB/GEN/3.json",
      expect.anything()
    );
  });

  it("returns null for previous chapter when no link is present", async () => {
    const api = new FreeUseBibleAPI(FREE_USE_BIBLE_API_ENDPOINT);
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
      "https://override.example/api/BSB/GEN/1.json",
      expect.anything()
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
      "https://override.example/abc/def/api/BSB/GEN/1.json",
      expect.anything()
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
      "https://example.com/api/available_translations.json",
      expect.anything()
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/api/available_translations.json",
      expect.anything()
    );
  });

  it("re-requests available translations when refresh is set", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse({ translations: [{ id: "BSB", sha256: "one" }] })
      )
      .mockResolvedValueOnce(
        createResponse({ translations: [{ id: "BSB", sha256: "two" }] })
      );

    const api = new FreeUseBibleAPI("https://example.com/");

    await api.getAvailableTranslations();
    const cached = await api.getAvailableTranslations();
    expect(cached.translations[0]?.sha256).toBe("one");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const refreshed = await api.getAvailableTranslations(undefined, {
      refresh: true,
    });

    expect(refreshed.translations[0]?.sha256).toBe("two");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("getCompleteTranslation()", () => {
    function createStreamingResponse<T>(
      payload: T,
      options: { chunks?: number; withContentLength?: boolean } = {}
    ) {
      const { chunks = 3, withContentLength = true } = options;
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const chunkSize = Math.max(1, Math.ceil(bytes.byteLength / chunks));

      return {
        status: 200,
        statusText: "OK",
        headers: new Headers(
          withContentLength
            ? { "content-length": String(bytes.byteLength) }
            : {}
        ),
        body: new ReadableStream<Uint8Array<ArrayBuffer>>({
          start(controller) {
            for (
              let offset = 0;
              offset < bytes.byteLength;
              offset += chunkSize
            ) {
              controller.enqueue(bytes.slice(offset, offset + chunkSize));
            }
            controller.close();
          },
        }),
        json: () => Promise.resolve(payload),
        byteLength: bytes.byteLength,
      };
    }

    const payload = {
      translation: { id: "BSB", sha256: "abc" },
      books: [{ id: "GEN", chapters: [] }],
    };

    it("downloads from the conventional path when given an ID", async () => {
      fetchMock.mockResolvedValue(createResponse(payload));

      const api = new FreeUseBibleAPI("https://example.com/");
      const result = await api.getCompleteTranslation("BSB");

      expect(result).toEqual(payload);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.com/api/BSB/complete.json",
        { signal: undefined }
      );
    });

    it("prefers the link the API reported over the conventional path", async () => {
      fetchMock.mockResolvedValue(createResponse(payload));

      const api = new FreeUseBibleAPI("https://example.com/");
      await api.getCompleteTranslation({
        id: "BSB",
        completeTranslationApiLink: "/api/custom/BSB.json",
        // The rest of the Translation fields are irrelevant to this method.
      } as never);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.com/api/custom/BSB.json",
        { signal: undefined }
      );
    });

    it("reports byte progress as the body streams in", async () => {
      const response = createStreamingResponse(payload, { chunks: 3 });
      fetchMock.mockResolvedValue(response);

      const api = new FreeUseBibleAPI("https://example.com/");
      const progress: Array<[number, number | null]> = [];
      const result = await api.getCompleteTranslation("BSB", {
        onProgress: (received, total) => progress.push([received, total]),
      });

      expect(result).toEqual(payload);
      // Starts at zero and ends at the full size, never exceeding the total.
      expect(progress[0]).toEqual([0, response.byteLength]);
      expect(progress.at(-1)).toEqual([
        response.byteLength,
        response.byteLength,
      ]);
      expect(progress.length).toBeGreaterThan(2);
      for (const [received, total] of progress) {
        expect(received).toBeLessThanOrEqual(total!);
      }
    });

    it("reports a null total when the server omits Content-Length", async () => {
      fetchMock.mockResolvedValue(
        createStreamingResponse(payload, { withContentLength: false })
      );

      const api = new FreeUseBibleAPI("https://example.com/");
      const totals: Array<number | null> = [];
      await api.getCompleteTranslation("BSB", {
        onProgress: (_received, total) => totals.push(total),
      });

      expect(totals.every((total) => total === null)).toBe(true);
    });

    it("decodes text whose characters are split across chunk boundaries", async () => {
      // The body is decoded chunk by chunk as it arrives rather than buffered
      // and decoded once at the end, which keeps peak memory near the size of
      // the payload instead of several times it. One byte per chunk is the
      // worst case for that: every non-ASCII character arrives in pieces, so a
      // decoder that treated each chunk as standalone text would corrupt them.
      const multiByte = {
        translation: { id: "BSB", name: "Ἡ Καινὴ Διαθήκη — 聖經 🕊" },
        books: [{ id: "GEN", chapters: [] }],
      };
      const byteLength = new TextEncoder().encode(
        JSON.stringify(multiByte)
      ).byteLength;
      fetchMock.mockResolvedValue(
        createStreamingResponse(multiByte, { chunks: byteLength })
      );

      const api = new FreeUseBibleAPI("https://example.com/");
      const result = await api.getCompleteTranslation("BSB", {
        onProgress: () => {},
      });

      expect(result).toEqual(multiByte);
    });

    it("does not cache the response, so a second download re-requests it", async () => {
      fetchMock.mockResolvedValue(createResponse(payload));

      const api = new FreeUseBibleAPI("https://example.com/");
      await api.getCompleteTranslation("BSB");
      await api.getCompleteTranslation("BSB");

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws on non-2xx responses", async () => {
      fetchMock.mockResolvedValue(createResponse(null, 404, "Not Found"));

      const api = new FreeUseBibleAPI("https://example.com/");

      await expect(api.getCompleteTranslation("NOPE")).rejects.toThrow(
        "Failed request to https://example.com/api/NOPE/complete.json. Status: 404 Not Found"
      );
    });
  });

  it("rejects with an AbortError when the caller's signal is aborted", async () => {
    fetchMock.mockImplementation(
      (_url: string, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        })
    );

    const api = new FreeUseBibleAPI("https://example.com/");
    const controller = new AbortController();

    const result = api.getAvailableTranslations(undefined, {
      signal: controller.signal,
    });
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborting one caller's own signal only rejects that caller, leaving other subscribers to the same shared request unaffected", async () => {
    let resolveFetch: (() => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve(createResponse({ translations: [{ id: "eng_kjv" }] }));
        })
    );

    const api = new FreeUseBibleAPI("https://example.com/");
    // The creator has no signal of its own — it can never voluntarily walk
    // away, so it must always eventually see the shared result.
    const creator = api.getAvailableTranslations();
    // A second, unrelated caller reuses the cached in-flight promise and
    // aborts its own signal. That must reject its own promise, but the
    // creator (or any other subscriber) must be completely unaffected.
    const controller = new AbortController();
    const joiner = api.getAvailableTranslations(undefined, {
      signal: controller.signal,
    });
    controller.abort();

    resolveFetch!();

    await expect(joiner).rejects.toMatchObject({ name: "AbortError" });
    await expect(creator).resolves.toEqual({
      translations: [{ id: "eng_kjv" }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("only cancels the underlying request once every subscriber has aborted, not when the first one does", async () => {
    let capturedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url: string, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          capturedSignal = options?.signal;
          options?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        })
    );

    const api = new FreeUseBibleAPI("https://example.com/");
    const controllerA = new AbortController();
    const controllerB = new AbortController();

    // callerA creates the shared request; callerB joins via the cache hit.
    const callerA = api.getAvailableTranslations(undefined, {
      signal: controllerA.signal,
    });
    const callerB = api.getAvailableTranslations(undefined, {
      signal: controllerB.signal,
    });

    controllerA.abort();

    // callerA's own request is cancelled...
    await expect(callerA).rejects.toMatchObject({ name: "AbortError" });
    // ...but the real underlying request is still alive for callerB, who
    // never asked to cancel anything.
    expect(capturedSignal?.aborted).toBe(false);

    controllerB.abort();

    // Now that every subscriber has walked away, the real request is
    // actually cancelled too.
    expect(capturedSignal?.aborted).toBe(true);
    await expect(callerB).rejects.toMatchObject({ name: "AbortError" });
  });

  it("evicts the cache entry when an aborted request created it, allowing a fresh retry", async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        })
    );
    fetchMock.mockResolvedValueOnce(createResponse({ translations: [] }));

    const api = new FreeUseBibleAPI("https://example.com/");
    const controller = new AbortController();

    const first = api.getAvailableTranslations(undefined, {
      signal: controller.signal,
    });
    controller.abort();

    await expect(first).rejects.toMatchObject({ name: "AbortError" });

    const retry = await api.getAvailableTranslations();

    expect(retry).toEqual({ translations: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not hand an abort to a caller that arrives before the cancelled request has rejected", async () => {
    // Cancelling only *starts* the teardown: the underlying rejection, and the
    // cache eviction that rides on it, land a microtask later. A request made
    // inside that window must not be handed the doomed shared promise — it
    // never asked to cancel anything. Reachable by flipping back to a chapter
    // whose request was just superseded.
    fetchMock.mockImplementationOnce(
      (_url: string, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        })
    );
    fetchMock.mockResolvedValueOnce(createResponse({ translations: [] }));

    const api = new FreeUseBibleAPI("https://example.com/");
    const controller = new AbortController();

    const first = api.getAvailableTranslations(undefined, {
      signal: controller.signal,
    });
    controller.abort();

    // Deliberately not awaiting `first` before this call.
    const second = api.getAvailableTranslations();

    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(second).resolves.toEqual({ translations: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
