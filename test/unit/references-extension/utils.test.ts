import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { CrossReference } from "@packages/references-extension/references/manager/interfaces";

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

const axios = (await import("axios")).default;
const get = vi.mocked(axios.get);

const {
  GetReferences,
  createRefsWithText,
  downloadReferences,
  estimateReferencesSizeBytes,
  getVerseReferences,
  loadReferenceDatasetIndex,
  selectTopReferences,
} = await import("@packages/references-extension/references/manager/utils");

const BASE_URL = "https://vmfnri.helloao.org/api/d/open-cross-ref";

function ref(overrides: Partial<CrossReference> = {}): CrossReference {
  return { book: "GEN", chapter: 1, verse: 1, ...overrides };
}

/** A chapter payload shaped the way the open-cross-ref API returns one. */
function chapterPayload(
  verses: Array<{ verse: number; references: CrossReference[] }>
) {
  return { data: { chapter: { content: verses } }, status: 200 };
}

/** A `books.json` payload, listing books the way the dataset does. */
function booksPayload(
  books: Array<{
    id: string;
    numberOfChapters: number;
    totalNumberOfReferences?: number;
  }>
) {
  return {
    data: {
      books: books.map((book) => ({
        totalNumberOfReferences: 0,
        ...book,
      })),
    },
    status: 200,
  };
}

/**
 * Routes the mocked `axios.get` by URL, so a test states what the API holds
 * rather than what order the code asks for it in.
 */
function serveApi(options: {
  // Loose, so a test can serve a malformed payload as well as a well-formed one.
  books?: { data: unknown; status: number };
  chapter?: (bookId: string, chapter: number) => unknown;
}) {
  get.mockImplementation(async (url: string) => {
    if (url.endsWith("/books.json")) {
      if (!options.books) {
        throw new Error(`Unexpected books request: ${url}`);
      }
      return options.books;
    }

    const match = /\/([A-Z0-9]+)\/(\d+)\.json$/.exec(url);
    if (!match || !options.chapter) {
      throw new Error(`Unexpected request: ${url}`);
    }
    return options.chapter(match[1]!, Number(match[2]!));
  });
}

/** Stands in for the app's Bible data at the point the extension reads it. */
function dataManagerWith(
  chapters: Record<
    string,
    { type: string; number: number; content: unknown[] }[]
  >
): BibleDataManager {
  return {
    getTranslationBookChapter: async (
      _translationId: string,
      book: string,
      chapter: number
    ) => {
      const content = chapters[`${book}.${chapter}`];
      if (!content) {
        throw new Error(`No chapter loaded for ${book} ${chapter}`);
      }
      return { chapter: { content } };
    },
  } as unknown as BibleDataManager;
}

beforeEach(() => {
  get.mockReset();
});

describe("selectTopReferences()", () => {
  it("puts the strongest references first and caps the list", () => {
    const weak = ref({ verse: 1, score: 1 });
    const strong = ref({ verse: 2, score: 9 });
    const middling = ref({ verse: 3, score: 5 });

    expect(selectTopReferences([weak, strong, middling], 2)).toEqual([
      strong,
      middling,
    ]);
  });

  it("drops references the dataset gave no score", () => {
    const scored = ref({ verse: 1, score: 3 });
    const unscored = ref({ verse: 2 });

    expect(selectTopReferences([scored, unscored], 10)).toEqual([scored]);
  });

  it("returns nothing for an empty list", () => {
    expect(selectTopReferences([], 5)).toEqual([]);
  });

  it("leaves the caller's array untouched", () => {
    const references = [
      ref({ verse: 1, score: 1 }),
      ref({ verse: 2, score: 9 }),
    ];

    selectTopReferences(references, 2);

    expect(references[0]!.verse).toBe(1);
  });
});

describe("GetReferences()", () => {
  it("returns the chapter's cross-references", async () => {
    serveApi({
      chapter: () =>
        chapterPayload([{ verse: 3, references: [ref({ book: "EXO" })] }]),
    });

    expect(await GetReferences({ bookId: "GEN", chapter: 2 })).toEqual({
      book: "GEN",
      chapter: 2,
      references: [{ verse: 3, references: [ref({ book: "EXO" })] }],
    });
    expect(get).toHaveBeenCalledWith(`${BASE_URL}/GEN/2.json`);
  });

  it("reports an empty chapter rather than failing on it", async () => {
    serveApi({ chapter: () => ({ data: {}, status: 200 }) });

    expect(await GetReferences({ bookId: "GEN", chapter: 1 })).toEqual({
      book: "GEN",
      chapter: 1,
      references: [],
    });
  });

  it("works where IndexedDB is unavailable, as in SSR or blocked storage", async () => {
    // jsdom provides no IndexedDB, so this exercises the uncached path end to
    // end: the cache read and write both no-op and the fetch still resolves.
    expect(typeof indexedDB).toBe("undefined");
    serveApi({ chapter: () => chapterPayload([]) });

    await expect(
      GetReferences({ bookId: "PSA", chapter: 23 })
    ).resolves.toMatchObject({ book: "PSA", chapter: 23 });
  });

  it("surfaces a network failure to the caller", async () => {
    get.mockRejectedValue(new Error("offline"));

    await expect(GetReferences({ bookId: "GEN", chapter: 1 })).rejects.toThrow(
      "offline"
    );
  });
});

describe("getVerseReferences()", () => {
  it("picks out one verse's references from its chapter", async () => {
    const wanted = ref({ book: "ISA", chapter: 53, verse: 5 });
    serveApi({
      chapter: () =>
        chapterPayload([
          { verse: 1, references: [ref({ book: "EXO" })] },
          { verse: 16, references: [wanted] },
        ]),
    });

    expect(
      await getVerseReferences({ bookId: "JHN", chapter: 3, verse: 16 })
    ).toEqual([wanted]);
  });

  it("returns nothing for a verse the dataset doesn't cover", async () => {
    serveApi({
      chapter: () => chapterPayload([{ verse: 1, references: [ref()] }]),
    });

    expect(
      await getVerseReferences({ bookId: "JHN", chapter: 3, verse: 16 })
    ).toEqual([]);
  });
});

describe("createRefsWithText()", () => {
  it("separates the verses of a range with a space", async () => {
    // Without the space, the last word of one verse runs into the first word
    // of the next — the reason the text is collected per verse.
    const dataManager = dataManagerWith({
      "ROM.8": [
        { type: "verse", number: 38, content: ["For I am persuaded"] },
        {
          type: "verse",
          number: 39,
          content: ["shall be able to separate us"],
        },
      ],
    });

    const [withText] = await createRefsWithText({
      references: [
        ref({ book: "ROM", chapter: 8, verse: 38, endVerse: 39, score: 1 }),
      ],
      limit: 5,
      dataManager,
      translationId: "WEB",
    });

    expect(withText!.text).toBe(
      "For I am persuaded shall be able to separate us"
    );
  });

  it("reads text from both plain strings and formatted runs", async () => {
    const dataManager = dataManagerWith({
      "GEN.1": [
        {
          type: "verse",
          number: 1,
          content: ["In the beginning ", { text: "God" }, " created"],
        },
      ],
    });

    const [withText] = await createRefsWithText({
      references: [ref({ book: "GEN", chapter: 1, verse: 1, score: 1 })],
      limit: 5,
      dataManager,
      translationId: "WEB",
    });

    expect(withText!.text).toBe("In the beginning God created");
  });

  it("ignores headings and verses outside the range", async () => {
    const dataManager = dataManagerWith({
      "GEN.1": [
        { type: "heading", number: 0, content: ["The Creation"] },
        { type: "verse", number: 1, content: ["wanted"] },
        { type: "verse", number: 2, content: ["not wanted"] },
      ],
    });

    const [withText] = await createRefsWithText({
      references: [ref({ book: "GEN", chapter: 1, verse: 1, score: 1 })],
      limit: 5,
      dataManager,
      translationId: "WEB",
    });

    expect(withText!.text).toBe("wanted");
  });

  it("gives back an empty string when the chapter has no such verse", async () => {
    const dataManager = dataManagerWith({
      "GEN.1": [{ type: "verse", number: 1, content: ["only verse one"] }],
    });

    const [withText] = await createRefsWithText({
      references: [ref({ book: "GEN", chapter: 1, verse: 99, score: 1 })],
      limit: 5,
      dataManager,
      translationId: "WEB",
    });

    expect(withText!.text).toBe("");
  });

  it("fetches text only for the strongest references, up to the limit", async () => {
    const dataManager = dataManagerWith({
      "GEN.1": [{ type: "verse", number: 1, content: ["strongest"] }],
      "EXO.1": [{ type: "verse", number: 1, content: ["weakest"] }],
    });

    const withText = await createRefsWithText({
      references: [
        ref({ book: "EXO", chapter: 1, verse: 1, score: 1 }),
        ref({ book: "GEN", chapter: 1, verse: 1, score: 9 }),
      ],
      limit: 1,
      dataManager,
      translationId: "WEB",
    });

    expect(withText.map((entry) => entry.text)).toEqual(["strongest"]);
  });
});

describe("loadReferenceDatasetIndex()", () => {
  it("expands each book into its chapters, numbered from one", async () => {
    serveApi({
      books: booksPayload([
        { id: "GEN", numberOfChapters: 2 },
        { id: "EXO", numberOfChapters: 1 },
      ]),
    });

    const { chapters } = await loadReferenceDatasetIndex();

    expect(chapters).toEqual([
      { bookId: "GEN", chapter: 1 },
      { bookId: "GEN", chapter: 2 },
      { bookId: "EXO", chapter: 1 },
    ]);
  });

  it("totals the cross-references across every book", async () => {
    serveApi({
      books: booksPayload([
        { id: "GEN", numberOfChapters: 1, totalNumberOfReferences: 13327 },
        { id: "EXO", numberOfChapters: 1, totalNumberOfReferences: 6672 },
      ]),
    });

    expect((await loadReferenceDatasetIndex()).referenceCount).toBe(19999);
  });

  it("copes with a payload that lists no books", async () => {
    serveApi({ books: { data: {}, status: 200 } });

    expect(await loadReferenceDatasetIndex()).toEqual({
      chapters: [],
      referenceCount: 0,
    });
  });
});

describe("estimateReferencesSizeBytes()", () => {
  it("scales with the number of references", () => {
    expect(estimateReferencesSizeBytes(2000)).toBe(
      estimateReferencesSizeBytes(1000) * 2
    );
    expect(estimateReferencesSizeBytes(0)).toBe(0);
  });

  it("puts the real dataset in the range the offer promises", () => {
    // ~345,000 references, measured at roughly 18 MB on disk. A constant that
    // drifts far from that would quote users a misleading size.
    const megabytes = estimateReferencesSizeBytes(344_799) / 1024 / 1024;

    expect(megabytes).toBeGreaterThan(15);
    expect(megabytes).toBeLessThan(25);
  });
});

describe("downloadReferences()", () => {
  it("fetches every chapter the dataset lists", async () => {
    serveApi({
      books: booksPayload([
        { id: "GEN", numberOfChapters: 2 },
        { id: "EXO", numberOfChapters: 1 },
      ]),
      chapter: () => chapterPayload([]),
    });

    expect(await downloadReferences()).toEqual({
      total: 3,
      downloaded: 3,
      failed: 0,
    });
    expect(get).toHaveBeenCalledWith(`${BASE_URL}/GEN/2.json`);
  });

  it("keeps going past a chapter that fails, and counts it", async () => {
    serveApi({
      books: booksPayload([{ id: "GEN", numberOfChapters: 3 }]),
      chapter: (_book, chapter) => {
        if (chapter === 2) {
          throw new Error("500");
        }
        return chapterPayload([]);
      },
    });

    expect(await downloadReferences()).toEqual({
      total: 3,
      downloaded: 2,
      failed: 1,
    });
  });

  it("keeps at most twenty requests in flight", async () => {
    let inFlight = 0;
    let peak = 0;

    get.mockImplementation(async (url: string) => {
      if (url.endsWith("/books.json")) {
        return booksPayload([{ id: "PSA", numberOfChapters: 60 }]);
      }

      inFlight += 1;
      peak = Math.max(peak, inFlight);
      // A request that doesn't settle immediately, so the pool has to hold
      // chapters back rather than every one overlapping.
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return chapterPayload([]);
    });

    expect(await downloadReferences()).toMatchObject({
      total: 60,
      failed: 0,
    });
    expect(peak).toBe(20);
  });

  it("never opens more requests than there are chapters", async () => {
    let inFlight = 0;
    let peak = 0;

    get.mockImplementation(async (url: string) => {
      if (url.endsWith("/books.json")) {
        return booksPayload([{ id: "JUD", numberOfChapters: 3 }]);
      }

      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return chapterPayload([]);
    });

    await downloadReferences();

    expect(peak).toBe(3);
  });

  it("fails outright when the chapter list can't be read", async () => {
    get.mockRejectedValue(new Error("no network"));

    await expect(downloadReferences()).rejects.toThrow("no network");
  });
});
