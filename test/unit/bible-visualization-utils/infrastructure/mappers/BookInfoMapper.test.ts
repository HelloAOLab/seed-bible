import { BookInfoMapper } from "bibleVizUtils.infrastructure.mappers.BookInfoMapper";

// ─── factories ────────────────────────────────────────────────────────────────

const makeStaticInfo = (overrides: any = {}): any => ({
  author: "Moses",
  chaptersVerseCount: [31, 25, 24, 26, 34],
  relativeDateRange: { min: -1440, max: -1400 },
  numberOfChapters: 5,
  ...overrides,
});

const makeRepo = (staticInfo: any = makeStaticInfo()) => ({
  getBookStaticInfo: jest.fn().mockReturnValue(staticInfo),
  getBooksStaticInfo: jest.fn(),
  getTestamentNames: jest.fn(),
  getTestamentName: jest.fn(),
});

const makeRawBook = (overrides: any = {}): any => ({
  name: "GEN",
  color: "#ff0000",
  id: "book-id",
  ...overrides,
});

const makeRawSection = (overrides: any = {}): any => ({
  name: "Law",
  color: "#00ff00",
  id: "section-id",
  books: [makeRawBook()],
  ...overrides,
});

const makeRawTestament = (overrides: any = {}): any => ({
  name: "Old Testament",
  color: "#0000ff",
  id: "testament-id",
  sections: [makeRawSection()],
  ...overrides,
});

const makeRawArrangement = (overrides: any = {}): any => ({
  name: "Canonical",
  id: "arrangement-id",
  testaments: [makeRawTestament()],
  ...overrides,
});

const makeConfigProvider = (arrangements: any[] = [makeRawArrangement()]) => ({
  getRawStaticArrangements: jest.fn().mockReturnValue(arrangements),
});

const makeCustomStore = (arrangements: any[] = []) => ({
  getRawArrangements: jest.fn().mockReturnValue(arrangements),
});

const makeMapper = ({
  repo = makeRepo(),
  configProvider = makeConfigProvider(),
  customStore = makeCustomStore(),
} = {}) => ({
  mapper: new BookInfoMapper({
    arrangementConfigProviderPort: configProvider,
    customArrangementStorePort: customStore,
    booksStaticInfoRepository: repo,
  }),
  repo,
  configProvider,
  customStore,
});

const makeCompleteInfo = (overrides: any = {}): any => ({
  type: "complete",
  bookId: "GEN",
  customColor: "#aabbcc",
  customLabelColor: "#ddeeff",
  isCheckpoint: false,
  group: "group-1",
  ...overrides,
});

const makeSubsetInfo = (overrides: any = {}): any => ({
  type: "subset",
  bookId: "PSA",
  completeBookId: "PSA-full",
  startIndex: 1,
  endIndex: 3,
  translationRule: "some-rule",
  customColor: "#aabbcc",
  customLabelColor: "#ddeeff",
  isCheckpoint: false,
  group: "group-1",
  ...overrides,
});

const makePath = (overrides: any = {}): any => ({
  arrangementName: "Canonical",
  testamentIndex: 0,
  sectionIndex: 0,
  bookIndex: 0,
  ...overrides,
});

const makeDomainBook = (overrides: any = {}): any => ({
  bookId: "GEN",
  type: "complete",
  author: "Moses",
  chaptersVerseCount: [31],
  relativeDateRange: { min: -1440, max: -1400 },
  numberOfChapters: 1,
  customColor: "#aabbcc",
  path: makePath(),
  ...overrides,
});

// ─── toDomain — complete type ─────────────────────────────────────────────────

describe("toDomain — complete type", () => {
  it("returns type 'complete'", () => {
    const { mapper } = makeMapper();
    expect(mapper.toDomain(makeCompleteInfo(), makePath()).type).toBe(
      "complete"
    );
  });

  it("maps bookId from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeCompleteInfo({ bookId: "REV" }), makePath()).bookId
    ).toBe("REV");
  });

  it("calls getBookStaticInfo with info.bookId", () => {
    const repo = makeRepo();
    const { mapper } = makeMapper({ repo });
    mapper.toDomain(makeCompleteInfo({ bookId: "EXO" }), makePath());
    expect(repo.getBookStaticInfo).toHaveBeenCalledWith("EXO");
  });

  it("copies author from staticInfo", () => {
    const { mapper } = makeMapper({
      repo: makeRepo(makeStaticInfo({ author: "John" })),
    });
    expect(mapper.toDomain(makeCompleteInfo(), makePath()).author).toBe("John");
  });

  it("copies chaptersVerseCount from staticInfo", () => {
    const counts = [20, 30, 10];
    const { mapper } = makeMapper({
      repo: makeRepo(makeStaticInfo({ chaptersVerseCount: counts })),
    });
    expect(
      mapper.toDomain(makeCompleteInfo(), makePath()).chaptersVerseCount
    ).toEqual(counts);
  });

  it("copies relativeDateRange from staticInfo", () => {
    const range = { min: 60, max: 70 };
    const { mapper } = makeMapper({
      repo: makeRepo(makeStaticInfo({ relativeDateRange: range })),
    });
    expect(
      mapper.toDomain(makeCompleteInfo(), makePath()).relativeDateRange
    ).toEqual(range);
  });

  it("copies numberOfChapters from staticInfo", () => {
    const { mapper } = makeMapper({
      repo: makeRepo(makeStaticInfo({ numberOfChapters: 22 })),
    });
    expect(
      mapper.toDomain(makeCompleteInfo(), makePath()).numberOfChapters
    ).toBe(22);
  });

  it("maps customColor from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeCompleteInfo({ customColor: "#ff1234" }), makePath())
        .customColor
    ).toBe("#ff1234");
  });

  it("maps customLabelColor from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(
        makeCompleteInfo({ customLabelColor: "#abc" }),
        makePath()
      ).customLabelColor
    ).toBe("#abc");
  });

  it("maps isCheckpoint from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeCompleteInfo({ isCheckpoint: true }), makePath())
        .isCheckpoint
    ).toBe(true);
  });

  it("maps group from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeCompleteInfo({ group: "g-42" }), makePath()).group
    ).toBe("g-42");
  });

  it("attaches the provided path", () => {
    const { mapper } = makeMapper();
    const path = makePath({ arrangementName: "Thematic", testamentIndex: 2 });
    expect(mapper.toDomain(makeCompleteInfo(), path).path).toEqual(path);
  });

  it("throws when staticInfo is not found", () => {
    const repo = makeRepo();
    repo.getBookStaticInfo.mockReturnValue(undefined);
    const { mapper } = makeMapper({ repo });
    expect(() =>
      mapper.toDomain(makeCompleteInfo({ bookId: "XXX" }), makePath())
    ).toThrow("staticInfo not found for XXX");
  });
});

// ─── toDomain — subset type ───────────────────────────────────────────────────

describe("toDomain — subset type", () => {
  it("returns type 'subset'", () => {
    const { mapper } = makeMapper();
    expect(mapper.toDomain(makeSubsetInfo(), makePath()).type).toBe("subset");
  });

  it("maps bookId from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeSubsetInfo({ bookId: "PSA" }), makePath()).bookId
    ).toBe("PSA");
  });

  it("maps completeBookId from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(
        makeSubsetInfo({ completeBookId: "PSA-full" }),
        makePath()
      ).completeBookId
    ).toBe("PSA-full");
  });

  it("calls getBookStaticInfo with info.completeBookId", () => {
    const repo = makeRepo();
    const { mapper } = makeMapper({ repo });
    mapper.toDomain(makeSubsetInfo({ completeBookId: "PSA-c" }), makePath());
    expect(repo.getBookStaticInfo).toHaveBeenCalledWith("PSA-c");
  });

  it("slices chaptersVerseCount from startIndex to endIndex (inclusive)", () => {
    const repo = makeRepo(
      makeStaticInfo({
        chaptersVerseCount: [10, 20, 30, 40, 50],
        numberOfChapters: 5,
      })
    );
    const { mapper } = makeMapper({ repo });
    // startIndex=1, endIndex=3 → slice(1, 4) = [20, 30, 40]
    expect(
      mapper.toDomain(
        makeSubsetInfo({ startIndex: 1, endIndex: 3 }),
        makePath()
      ).chaptersVerseCount
    ).toEqual([20, 30, 40]);
  });

  it("defaults startIndex to 0 when not set", () => {
    const repo = makeRepo(
      makeStaticInfo({ chaptersVerseCount: [10, 20, 30], numberOfChapters: 3 })
    );
    const { mapper } = makeMapper({ repo });
    const result = mapper.toDomain(
      makeSubsetInfo({ startIndex: undefined, endIndex: 1 }),
      makePath()
    );
    expect(result.chaptersVerseCount).toEqual([10, 20]);
  });

  it("defaults endIndex to numberOfChapters-1 when not set", () => {
    const repo = makeRepo(
      makeStaticInfo({ chaptersVerseCount: [10, 20, 30], numberOfChapters: 3 })
    );
    const { mapper } = makeMapper({ repo });
    const result = mapper.toDomain(
      makeSubsetInfo({ startIndex: 1, endIndex: undefined }),
      makePath()
    );
    // endIndex = 3 - 1 = 2 → slice(1, 3) = [20, 30]
    expect(result.chaptersVerseCount).toEqual([20, 30]);
  });

  it("sets numberOfChapters to the length of the sliced chaptersVerseCount", () => {
    const repo = makeRepo(
      makeStaticInfo({
        chaptersVerseCount: [10, 20, 30, 40, 50],
        numberOfChapters: 5,
      })
    );
    const { mapper } = makeMapper({ repo });
    const result = mapper.toDomain(
      makeSubsetInfo({ startIndex: 0, endIndex: 1 }),
      makePath()
    );
    expect(result.numberOfChapters).toBe(2);
  });

  it("copies author from completeStaticInfo", () => {
    const repo = makeRepo(makeStaticInfo({ author: "David" }));
    const { mapper } = makeMapper({ repo });
    expect(mapper.toDomain(makeSubsetInfo(), makePath()).author).toBe("David");
  });

  it("copies relativeDateRange from completeStaticInfo", () => {
    const range = { min: 100, max: 200 };
    const repo = makeRepo(makeStaticInfo({ relativeDateRange: range }));
    const { mapper } = makeMapper({ repo });
    expect(
      mapper.toDomain(makeSubsetInfo(), makePath()).relativeDateRange
    ).toEqual(range);
  });

  it("maps startIndex from info (including undefined)", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeSubsetInfo({ startIndex: undefined }), makePath())
        .startIndex
    ).toBeUndefined();
  });

  it("maps endIndex from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeSubsetInfo({ endIndex: 4 }), makePath()).endIndex
    ).toBe(4);
  });

  it("maps translationRule from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(
        makeSubsetInfo({ translationRule: "my-rule" }),
        makePath()
      ).translationRule
    ).toBe("my-rule");
  });

  it("maps customColor from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeSubsetInfo({ customColor: "#aabbcc" }), makePath())
        .customColor
    ).toBe("#aabbcc");
  });

  it("attaches the provided path", () => {
    const { mapper } = makeMapper();
    const path = makePath({ sectionIndex: 2 });
    expect(mapper.toDomain(makeSubsetInfo(), path).path).toEqual(path);
  });

  it("throws when completeStaticInfo is not found", () => {
    const repo = makeRepo();
    repo.getBookStaticInfo.mockReturnValue(undefined);
    const { mapper } = makeMapper({ repo });
    expect(() =>
      mapper.toDomain(makeSubsetInfo({ completeBookId: "MISSING" }), makePath())
    ).toThrow("staticInfo not found for MISSING");
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls getRawStaticArrangements", () => {
    const configProvider = makeConfigProvider();
    const { mapper } = makeMapper({ configProvider });
    mapper.toInfrastructure(makeDomainBook());
    expect(configProvider.getRawStaticArrangements).toHaveBeenCalled();
  });

  it("returns the book config found in static arrangements", () => {
    const rawBook = makeRawBook({ name: "GEN", color: "#ff0000" });
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [
        makeRawTestament({ sections: [makeRawSection({ books: [rawBook] })] }),
      ],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    expect(mapper.toInfrastructure(makeDomainBook())).toBe(rawBook);
  });

  it("searches custom arrangements when name is not in static", () => {
    const configProvider = makeConfigProvider([]);
    const rawBook = makeRawBook({ name: "GEN" });
    const customArrangement = makeRawArrangement({
      name: "Custom",
      testaments: [
        makeRawTestament({ sections: [makeRawSection({ books: [rawBook] })] }),
      ],
    });
    const customStore = makeCustomStore([customArrangement]);
    const { mapper } = makeMapper({ configProvider, customStore });
    const book = makeDomainBook({
      path: makePath({ arrangementName: "Custom" }),
    });
    expect(mapper.toInfrastructure(book)).toBe(rawBook);
  });

  it("calls getRawArrangements only when static search fails", () => {
    const configProvider = makeConfigProvider([
      makeRawArrangement({ name: "Canonical" }),
    ]);
    const customStore = makeCustomStore();
    const { mapper } = makeMapper({ configProvider, customStore });
    mapper.toInfrastructure(makeDomainBook());
    expect(customStore.getRawArrangements).not.toHaveBeenCalled();
  });

  it("throws when arrangement is not found in static or custom", () => {
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([]),
      customStore: makeCustomStore([]),
    });
    expect(() => mapper.toInfrastructure(makeDomainBook())).toThrow(
      "foundArrangement not found at toInfrastructure"
    );
  });

  it("uses testamentIndex to locate the correct testament", () => {
    const targetBook = makeRawBook({ name: "REV" });
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [
        makeRawTestament({
          sections: [makeRawSection({ books: [makeRawBook({ name: "GEN" })] })],
        }),
        makeRawTestament({
          sections: [makeRawSection({ books: [targetBook] })],
        }),
      ],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    const book = makeDomainBook({ path: makePath({ testamentIndex: 1 }) });
    expect(mapper.toInfrastructure(book)).toBe(targetBook);
  });

  it("uses sectionIndex to locate the correct section", () => {
    const targetBook = makeRawBook({ name: "PSA" });
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [
        makeRawTestament({
          sections: [
            makeRawSection({ books: [makeRawBook({ name: "GEN" })] }),
            makeRawSection({ books: [targetBook] }),
          ],
        }),
      ],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    const book = makeDomainBook({ path: makePath({ sectionIndex: 1 }) });
    expect(mapper.toInfrastructure(book)).toBe(targetBook);
  });

  it("uses bookIndex to locate the correct book", () => {
    const targetBook = makeRawBook({ name: "EXO" });
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [
        makeRawTestament({
          sections: [
            makeRawSection({
              books: [makeRawBook({ name: "GEN" }), targetBook],
            }),
          ],
        }),
      ],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    const book = makeDomainBook({ path: makePath({ bookIndex: 1 }) });
    expect(mapper.toInfrastructure(book)).toBe(targetBook);
  });

  it("throws when the book at the path indices does not exist", () => {
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [
        makeRawTestament({ sections: [makeRawSection({ books: [] })] }),
      ],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    expect(() => mapper.toInfrastructure(makeDomainBook())).toThrow(
      "infrastructureInfo not found at toInfrastructure"
    );
  });
});
