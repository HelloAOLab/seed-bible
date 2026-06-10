import type { Mock } from "vitest";

vi.mock("typesense-fixed", () => {
  const search = vi.fn();
  const documents = vi.fn(() => ({ search }));
  const collections = vi.fn(() => ({ documents }));
  const client = vi.fn(() => ({ collections }));

  return {
    __esModule: true,
    default: {
      Client: client,
    },
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
  const mockedTypesense = (await vi.importMock("typesense-fixed")) as {
    default: {
      Client: Mock;
    };
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
    const mockedTypesense = (await vi.importMock("typesense-fixed")) as {
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
