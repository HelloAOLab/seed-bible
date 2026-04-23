jest.mock("typesense-fixed", () => {
  const search = jest.fn();
  const documents = jest.fn(() => ({ search }));
  const collections = jest.fn(() => ({ documents }));
  const client = jest.fn(() => ({ collections }));

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

function getTypesenseMock() {
  const mockedTypesense = jest.requireMock("typesense-fixed") as {
    default: {
      Client: jest.Mock;
    };
    __mock: {
      client: jest.Mock;
      collections: jest.Mock;
      documents: jest.Mock;
      search: jest.Mock;
    };
  };

  return mockedTypesense.__mock;
}

describe("createSearchManager", () => {
  beforeAll(async () => {
    ({ createSearchManager } =
      await import("@packages/seed-bible/seed-bible/managers/SearchManager"));
  });

  beforeEach(() => {
    const mockedTypesense = jest.requireMock("typesense-fixed") as {
      __mock: {
        client: jest.Mock;
        collections: jest.Mock;
        documents: jest.Mock;
        search: jest.Mock;
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
    const typesenseMock = getTypesenseMock();
    typesenseMock.search.mockResolvedValue(response);
    const result = await manager.search("verses", "BSB", "beginning");

    expect(result).toBe(response);
    expect(typesenseMock.client).toHaveBeenCalledWith({
      apiKey: "2q7kmXHFUNXxutBv1zgXlhWcHyda7f5I",
      nodes: [
        {
          host: "search.ao.bot",
          port: 443,
          protocol: "https",
        },
      ],
    });
    expect(typesenseMock.collections).toHaveBeenCalledWith("bible-verses");
    expect(typesenseMock.search).toHaveBeenCalledWith({
      q: "beginning",
      query_by: ["referenceNormalized", "reference", "text"],
      filter_by: 'translation:="BSB"',
    });
  });

  it("maps object filters to filter_by clauses", async () => {
    const manager = createSearchManager();
    const typesenseMock = getTypesenseMock();
    typesenseMock.search.mockResolvedValue({
      found: 0,
      out_of: 0,
      page: 1,
      hits: [],
    });

    await manager.search("verses", "BSB", "light", {
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
    const typesenseMock = getTypesenseMock();
    typesenseMock.search.mockResolvedValue({
      found: 0,
      out_of: 0,
      page: 1,
      hits: [],
    });

    await manager.search("verses", "NIV", "faith", 'translation_id:="NIV"');

    expect(typesenseMock.search).toHaveBeenCalledWith({
      q: "faith",
      query_by: ["referenceNormalized", "reference", "text"],
      filter_by: 'translation:="NIV" && translation_id:="NIV"',
    });
  });
});
