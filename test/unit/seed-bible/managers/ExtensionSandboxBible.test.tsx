// Real i18next isn't initialized in unit tests; the manager only needs to
// register translations and read the language.
vi.mock(
  "@packages/seed-bible/seed-bible/i18n/I18nManager",
  async (original) => ({
    ...(await original<object>()),
    addTranslations: vi.fn(),
    i18n: { language: "en", on: () => {} },
  })
);
import {
  defineExtension,
  SandboxError,
  type SandboxContext,
} from "@packages/seed-bible/seed-bible/extensions";
import {
  createBibleDataManager,
  type BibleDataManager,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { ExtensionManager } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createInMemoryTranslationStore } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import { useSandboxHarness } from "./sandboxHarness";
import {
  aabBooks,
  createResponse,
  EXAMPLE_API_ENDPOINT,
  makeChapter,
  makeCompleteTranslation,
  type WebResponseMap,
} from "./testUtils/mockBibleApiData";

const api = (path: string) => new URL(path, EXAMPLE_API_ENDPOINT).href;

const commentary = {
  id: "adam-clarke",
  name: "Adam Clarke Bible Commentary",
  englishName: "Adam Clarke Bible Commentary",
  website: "https://example.com",
  licenseUrl: "https://example.com/license",
  language: "eng",
  textDirection: "ltr" as const,
  listOfBooksApiLink: "/api/c/adam-clarke/books.json",
  availableFormats: ["json" as const],
  numberOfBooks: 66,
  totalNumberOfChapters: 1189,
  totalNumberOfVerses: 31102,
};

const commentaryBook = (id: string, order: number) => ({
  id,
  name: id,
  commonName: id,
  order,
  firstChapterNumber: 1,
  firstChapterApiLink: `/api/c/adam-clarke/${id}/1.json`,
  lastChapterNumber: 3,
  lastChapterApiLink: `/api/c/adam-clarke/${id}/3.json`,
  numberOfChapters: 3,
  totalNumberOfVerses: 80,
});

const dataset = {
  id: "open-cross-ref",
  name: "Open Cross Ref",
  englishName: "Open Cross Ref",
  website: "https://example.com",
  licenseUrl: "https://example.com/license",
  language: "eng",
  textDirection: "ltr" as const,
  listOfBooksApiLink: "/api/d/open-cross-ref/books.json",
  availableFormats: ["json" as const],
  numberOfBooks: 66,
  totalNumberOfChapters: 1189,
  totalNumberOfVerses: 31102,
  totalNumberOfReferences: 340000,
};

/** What the Free Use Bible API serves in these tests. */
function apiResponses(): WebResponseMap {
  return {
    [api("api/available_translations.json")]: createResponse({
      translations: [aabBooks.translation],
    }),
    [api("api/AAB/books.json")]: createResponse(aabBooks),
    [api("api/AAB/GEN/50.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 50, [
        { type: "heading", content: ["Joseph's Death"] },
        { type: "verse", number: 1, content: ["Joseph wept", { noteId: 0 }] },
        { type: "line_break" },
        {
          type: "verse",
          number: 2,
          content: [{ text: "and was embalmed.", wordsOfJesus: false }],
        },
      ])
    ),
    [api("api/AAB/complete.json")]: createResponse(
      makeCompleteTranslation(aabBooks, 2)
    ),
    [api("api/available_commentaries.json")]: createResponse({
      commentaries: [commentary],
    }),
    [api("api/c/adam-clarke/books.json")]: createResponse({
      commentary,
      books: [commentaryBook("GEN", 1), commentaryBook("EXO", 2)],
    }),
    [api("api/c/adam-clarke/GEN/3.json")]: createResponse({
      commentary,
      book: commentaryBook("GEN", 1),
      thisChapterLink: "/api/c/adam-clarke/GEN/3.json",
      nextChapterApiLink: "/api/c/adam-clarke/EXO/1.json",
      previousChapterApiLink: "/api/c/adam-clarke/GEN/2.json",
      numberOfVerses: 1,
      chapter: {
        number: 3,
        introduction: "The fall.",
        content: [
          { type: "verse", number: 1, content: ["The serpent was subtle."] },
        ],
      },
    }),
    [api("api/c/adam-clarke/profiles/aaron.json")]: createResponse({
      commentary,
      profile: {
        id: "aaron",
        subject: "Aaron",
        reference: { book: "EXO", chapter: 4, verse: 14 },
        thisProfileLink: "/api/c/adam-clarke/profiles/aaron.json",
        referenceChapterLink: "/api/c/adam-clarke/EXO/4.json",
      },
      content: ["The brother of Moses."],
    }),
    [api("api/available_datasets.json")]: createResponse({
      datasets: [dataset],
    }),
    [api("api/d/open-cross-ref/JHN/3.json")]: createResponse({
      dataset,
      book: {
        id: "JHN",
        order: 43,
        firstChapterNumber: 1,
        firstChapterApiLink: "/api/d/open-cross-ref/JHN/1.json",
        lastChapterNumber: 21,
        lastChapterApiLink: "/api/d/open-cross-ref/JHN/21.json",
        numberOfChapters: 21,
        totalNumberOfVerses: 879,
        totalNumberOfReferences: 9000,
      },
      thisChapterLink: "/api/d/open-cross-ref/JHN/3.json",
      nextChapterApiLink: null,
      previousChapterApiLink: null,
      numberOfVerses: 36,
      chapter: {
        number: 3,
        content: [
          {
            verse: 16,
            references: [
              { book: "ROM", chapter: 5, verse: 8, score: 40 },
              { book: "1JN", chapter: 4, verse: 9, endVerse: 10 },
            ],
          },
        ],
      },
    }),
  };
}

describe("sb.bible", () => {
  const h = useSandboxHarness();
  let manager: ExtensionManager;
  let bibleData: BibleDataManager;
  /** Whether the Bible API can be reached, as a connection would allow. */
  let online: boolean;

  beforeEach(() => {
    online = true;
    const responses = apiResponses();
    // Extension bundles still come from the harness; only the Bible API is
    // served (or cut off) here.
    const harnessFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      if (!url.startsWith(EXAMPLE_API_ENDPOINT)) {
        return harnessFetch(url, init);
      }
      if (!online) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      const response = responses[url];
      return response
        ? Promise.resolve(response)
        : Promise.resolve(createResponse(null, 404, "Not Found"));
    });
    bibleData = createBibleDataManager(
      new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
      { offlineStore: createInMemoryTranslationStore() }
    );
    h.host.context.bibleData = bibleData;
    manager = h.createManager();
  });

  afterEach(() => {
    bibleData.offline.dispose();
  });

  async function install(): Promise<SandboxContext> {
    let sb: SandboxContext | null = null;
    expect(
      await manager.loadExtension(
        await h.publish(defineExtension({ main: (s) => void (sb = s) }), {
          id: "ext.bible-reader",
        })
      )
    ).toBe(true);
    await vi.waitFor(() => expect(sb).not.toBeNull());
    return sb!;
  }

  async function downloadAab() {
    await bibleData.getTranslations();
    expect(await bibleData.offline.downloadTranslation("AAB")).toBe(true);
  }

  const codeOf = (promise: Promise<unknown>) =>
    promise.then(
      () => "ok",
      (err: SandboxError) => err.code
    );

  describe("translations", () => {
    it("lists the catalog, without the API's links", async () => {
      const sb = await install();

      const translations = await sb.bible.translations();

      expect(translations).toEqual([
        {
          id: "AAB",
          name: "Accessible Ancients Bible",
          englishName: "Accessible Ancients Bible",
          shortName: "AAB",
          language: "eng",
          languageName: null,
          languageEnglishName: null,
          textDirection: "ltr",
          website: "https://example.com",
          licenseUrl: "https://example.com/license",
          licenseNotice: null,
          numberOfBooks: 66,
          totalNumberOfChapters: 1189,
          totalNumberOfVerses: 31102,
          downloaded: false,
        },
      ]);
    });

    it("still lists downloaded translations after reloading with no connection", async () => {
      const store = await storeWithAab();
      online = false;
      // A fresh manager knows only what's on the device, as after a reload
      // made offline.
      bibleData.offline.dispose();
      bibleData = createBibleDataManager(
        new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
        { offlineStore: store }
      );
      h.host.context.bibleData = bibleData;
      const sb = await install();

      expect(
        (await sb.bible.translations()).map((t) => [t.id, t.downloaded])
      ).toEqual([["AAB", true]]);
    });

    it("is unavailable offline when nothing has been downloaded", async () => {
      online = false;
      const sb = await install();

      expect(await codeOf(sb.bible.translations())).toBe("unavailable");
    });
  });

  describe("books and chapters", () => {
    it("lists a translation's books", async () => {
      const sb = await install();

      const { translation, books } = await sb.bible.books({
        translationId: "AAB",
      });

      expect(translation.id).toBe("AAB");
      expect(books.map((book) => [book.id, book.numberOfChapters])).toEqual([
        ["GEN", 50],
        ["EXO", 40],
        ["MAT", 28],
      ]);
      expect(books[0]).toEqual({
        id: "GEN",
        name: "Genesis",
        commonName: "Genesis",
        title: null,
        order: 1,
        numberOfChapters: 50,
        firstChapterNumber: 1,
        lastChapterNumber: 50,
        totalNumberOfVerses: 1533,
        isApocryphal: false,
      });
    });

    it("gives a chapter's verses, layout, footnotes and neighbours", async () => {
      const sb = await install();

      expect(
        await sb.bible.chapter({
          translationId: "AAB",
          bookId: "GEN",
          chapter: 50,
        })
      ).toEqual({
        translationId: "AAB",
        bookId: "GEN",
        chapter: 50,
        verses: [
          { number: 1, text: "Joseph wept" },
          { number: 2, text: "and was embalmed." },
        ],
        content: [
          { type: "heading", text: "Joseph's Death" },
          { type: "verse", number: 1, text: "Joseph wept", footnotes: [0] },
          { type: "lineBreak" },
          {
            type: "verse",
            number: 2,
            text: "and was embalmed.",
            footnotes: [],
          },
        ],
        footnotes: [],
        // The last chapter of Genesis leads into Exodus.
        next: { bookId: "EXO", chapter: 1 },
        previous: { bookId: "GEN", chapter: 49 },
      });
    });

    it("reads a downloaded translation's books and chapters with no connection", async () => {
      await downloadAab();
      online = false;
      const sb = await install();

      const { books } = await sb.bible.books({ translationId: "AAB" });
      const chapter = await sb.bible.chapter({
        translationId: "AAB",
        bookId: "EXO",
        chapter: 2,
      });

      expect(books.map((book) => book.id)).toEqual(["GEN", "EXO", "MAT"]);
      expect(chapter.verses).toEqual([
        { number: 1, text: "Exodus 2:1" },
        { number: 2, text: "Exodus 2:2" },
      ]);
      expect(chapter.next).toEqual({ bookId: "MAT", chapter: 1 });
      expect(chapter.previous).toEqual({ bookId: "EXO", chapter: 1 });
    });

    it("is unavailable for a chapter that isn't downloaded, with no connection", async () => {
      online = false;
      const sb = await install();

      await expect(
        sb.bible.chapter({ translationId: "AAB", bookId: "GEN", chapter: 50 })
      ).rejects.toMatchObject({
        code: "unavailable",
        message: "Couldn't load AAB GEN 50.",
      });
    });

    it("refuses ids that aren't ids before asking the API", async () => {
      const sb = await install();

      expect(
        await codeOf(sb.bible.books({ translationId: "../secrets" }))
      ).toBe("invalid_request");
      expect(
        await codeOf(sb.bible.commentaryBooks({ commentaryId: "a/b" }))
      ).toBe("invalid_request");
    });
  });

  describe("commentaries", () => {
    it("lists commentaries and reads a chapter's notes", async () => {
      const sb = await install();

      expect((await sb.bible.commentaries()).map((c) => c.id)).toEqual([
        "adam-clarke",
      ]);
      expect(
        await sb.bible.commentaryChapter({
          commentaryId: "adam-clarke",
          bookId: "GEN",
          chapter: 3,
        })
      ).toEqual({
        commentaryId: "adam-clarke",
        bookId: "GEN",
        chapter: 3,
        introduction: "The fall.",
        verses: [{ number: 1, text: "The serpent was subtle." }],
        next: { bookId: "EXO", chapter: 1 },
        previous: { bookId: "GEN", chapter: 2 },
      });
    });

    it("reads a profile", async () => {
      const sb = await install();

      expect(
        await sb.bible.commentaryProfile({
          commentaryId: "adam-clarke",
          profileId: "aaron",
        })
      ).toEqual({
        id: "aaron",
        subject: "Aaron",
        reference: { bookId: "EXO", chapter: 4, verse: 14 },
        content: ["The brother of Moses."],
      });
    });

    it("is unavailable when the commentary doesn't exist", async () => {
      const sb = await install();

      expect(
        await codeOf(sb.bible.commentaryBooks({ commentaryId: "missing" }))
      ).toBe("unavailable");
    });
  });

  describe("datasets", () => {
    it("reads a chapter's cross-references", async () => {
      const sb = await install();

      expect((await sb.bible.datasets()).map((d) => d.id)).toEqual([
        "open-cross-ref",
      ]);
      expect(
        await sb.bible.datasetChapter({
          datasetId: "open-cross-ref",
          bookId: "JHN",
          chapter: 3,
        })
      ).toEqual({
        datasetId: "open-cross-ref",
        bookId: "JHN",
        chapter: 3,
        verses: [
          {
            verse: 16,
            references: [
              { bookId: "ROM", chapter: 5, verse: 8, score: 40 },
              { bookId: "1JN", chapter: 4, verse: 9, endVerse: 10 },
            ],
          },
        ],
      });
    });

    it("is unavailable with no connection", async () => {
      online = false;
      const sb = await install();

      expect(await codeOf(sb.bible.datasets())).toBe("unavailable");
    });
  });

  /** A device store holding AAB, downloaded while online. */
  async function storeWithAab() {
    const store = createInMemoryTranslationStore();
    const downloader = createBibleDataManager(
      new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
      { offlineStore: store }
    );
    await downloader.getTranslations();
    expect(await downloader.offline.downloadTranslation("AAB")).toBe(true);
    downloader.offline.dispose();
    return store;
  }
});
