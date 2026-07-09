import type { Mock } from "vitest";

vi.mock("typesense", () => {
  const search = vi.fn();
  const documents = vi.fn(() => ({ search }));
  const collections = vi.fn(() => ({ documents }));
  const client = vi.fn(
    class {
      collections = collections;
    }
  );

  return {
    __esModule: true,
    Client: client,
    __mock: {
      client,
      collections,
      documents,
      search,
    },
  };
});

let createSearchManager: typeof import("@packages/seed-bible/seed-bible/managers/SearchManager").createSearchManager;

async function getTypesenseMock() {
  const mockedTypesense = (await vi.importMock("typesense")) as {
    Client: Mock;
    __mock: {
      client: Mock;
      collections: Mock;
      documents: Mock;
      search: Mock;
    };
  };

  return mockedTypesense.__mock;
}

describe("createSearchManager", () => {
  beforeAll(async () => {
    ({ createSearchManager } =
      await import("@packages/seed-bible/seed-bible/managers/SearchManager"));
  });

  beforeEach(async () => {
    const mockedTypesense = (await vi.importMock("typesense")) as {
      __mock: {
        client: Mock;
        collections: Mock;
        documents: Mock;
        search: Mock;
      };
    };
    mockedTypesense.__mock.client.mockClear();
    mockedTypesense.__mock.collections.mockClear();
    mockedTypesense.__mock.documents.mockClear();
    mockedTypesense.__mock.search.mockReset();
  });

  it("searches the bible-verses collection for verses", async () => {
    const response = {
      found: 1,
      out_of: 1,
      page: 1,
      hits: [{ document: { id: "verse-1", text: "In the beginning" } }],
    };

    const manager = createSearchManager();
    const typesenseMock = await getTypesenseMock();
    typesenseMock.search.mockResolvedValue(response);
    const result = await manager.searchVerses("eng", "BSB", "beginning");

    expect(result).toBe(response);
    expect(typesenseMock.client).toHaveBeenCalledWith({
      apiKey: expect.any(String),
      nodes: [
        {
          host: "search.ao.bot",
          port: 443,
          protocol: "https",
        },
      ],
    });
    expect(typesenseMock.collections).toHaveBeenCalledWith("bibleVerses.eng");
    expect(typesenseMock.search).toHaveBeenCalledWith({
      q: "beginning",
      query_by: ["referenceNormalized", "reference", "text"],
      filter_by: 'translation:="BSB"',
    });
  });

  it("maps object filters to filter_by clauses", async () => {
    const manager = createSearchManager();
    const typesenseMock = await getTypesenseMock();
    typesenseMock.search.mockResolvedValue({
      found: 0,
      out_of: 0,
      page: 1,
      hits: [],
    });

    await manager.searchVerses("eng", "BSB", "light", {
      translation_id: "BSB",
      testament: ["old", "new"],
      chapter: 1,
    });

    expect(typesenseMock.search).toHaveBeenCalledWith({
      q: "light",
      query_by: ["referenceNormalized", "reference", "text"],
      filter_by:
        'translation:="BSB" && translation_id:="BSB" && testament:=["old", "new"] && chapter:=1',
    });
  });

  it("passes through string filters unchanged", async () => {
    const manager = createSearchManager();
    const typesenseMock = await getTypesenseMock();
    typesenseMock.search.mockResolvedValue({
      found: 0,
      out_of: 0,
      page: 1,
      hits: [],
    });

    await manager.searchVerses("eng", "NIV", "faith", 'translation_id:="NIV"');

    expect(typesenseMock.search).toHaveBeenCalledWith({
      q: "faith",
      query_by: ["referenceNormalized", "reference", "text"],
      filter_by: 'translation:="NIV" && translation_id:="NIV"',
    });
  });
});

describe("matchBookReferences", () => {
  let matchBookReferences: typeof import("@packages/seed-bible/seed-bible/managers/SearchManager").matchBookReferences;

  type TranslationBook =
    import("@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI").TranslationBook;

  const makeBook = (
    partial: Pick<
      TranslationBook,
      "id" | "commonName" | "order" | "lastChapterNumber"
    > &
      Partial<TranslationBook>
  ): TranslationBook => ({
    name: partial.commonName,
    title: null,
    firstChapterNumber: 1,
    numberOfChapters: partial.lastChapterNumber,
    firstChapterApiLink: "",
    lastChapterApiLink: "",
    totalNumberOfVerses: 0,
    ...partial,
  });

  const books: TranslationBook[] = [
    makeBook({
      id: "GEN",
      commonName: "Genesis",
      order: 1,
      lastChapterNumber: 50,
    }),
    makeBook({
      id: "EXO",
      commonName: "Exodus",
      order: 2,
      lastChapterNumber: 40,
    }),
    makeBook({
      id: "PSA",
      commonName: "Psalms",
      order: 19,
      lastChapterNumber: 150,
    }),
    makeBook({
      id: "JHN",
      commonName: "John",
      order: 43,
      lastChapterNumber: 21,
    }),
    makeBook({
      id: "1JN",
      commonName: "1 John",
      order: 62,
      lastChapterNumber: 5,
    }),
  ];

  beforeAll(async () => {
    ({ matchBookReferences } =
      await import("@packages/seed-bible/seed-bible/managers/SearchManager"));
  });

  it("returns the matching book as the top result", () => {
    const matches = matchBookReferences("gen", books);
    expect(matches[0]?.bookId).toBe("GEN");
    expect(matches[0]?.chapterNumber).toBeNull();
  });

  it("resolves a trailing chapter number", () => {
    const matches = matchBookReferences("Gen 2", books);
    expect(matches[0]).toMatchObject({ bookId: "GEN", chapterNumber: 2 });
  });

  it("resolves multi-digit chapters", () => {
    const matches = matchBookReferences("psa 51", books);
    expect(matches[0]).toMatchObject({ bookId: "PSA", chapterNumber: 51 });
  });

  it("matches on the book id / abbreviation", () => {
    const matches = matchBookReferences("PSA 5", books);
    expect(matches[0]).toMatchObject({ bookId: "PSA", chapterNumber: 5 });
  });

  it("ignores an out-of-range chapter number", () => {
    const matches = matchBookReferences("Gen 99", books);
    expect(matches[0]).toMatchObject({ bookId: "GEN", chapterNumber: null });
  });

  it("returns nothing for a bare number or empty text", () => {
    expect(matchBookReferences("5", books)).toEqual([]);
    expect(matchBookReferences("   ", books)).toEqual([]);
  });

  it("ranks a starts-with match above an includes-only match", () => {
    const matches = matchBookReferences("john", books);
    expect(matches[0]?.bookId).toBe("JHN");
    expect(matches.map((m) => m.bookId)).toContain("1JN");
    expect(
      matches.indexOf(matches.find((m) => m.bookId === "JHN")!)
    ).toBeLessThan(matches.indexOf(matches.find((m) => m.bookId === "1JN")!));
  });

  it("respects the result limit", () => {
    // "o" appears in Exodus, John, and 1 John.
    const matches = matchBookReferences("o", books, 2);
    expect(matches).toHaveLength(2);
  });
});
