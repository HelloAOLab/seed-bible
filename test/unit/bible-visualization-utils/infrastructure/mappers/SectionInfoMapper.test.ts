import { SectionInfoMapper } from "bibleVizUtils.infrastructure.mappers.SectionInfoMapper";

// ─── factories ────────────────────────────────────────────────────────────────

const makeRawBook = (overrides: any = {}): any => ({
  name: "GEN",
  color: "#ff0000",
  id: "book-id",
  ...overrides,
});

const makeRawSection = (overrides: any = {}): any => ({
  name: "Law",
  color: "#00ff00",
  translationKey: "section.law",
  books: [makeRawBook()],
  ...overrides,
});

const makeRawTestament = (overrides: any = {}): any => ({
  name: "Old Testament",
  color: "#0000ff",
  sections: [makeRawSection()],
  ...overrides,
});

const makeRawArrangement = (overrides: any = {}): any => ({
  name: "Canonical",
  testaments: [makeRawTestament()],
  ...overrides,
});

const makeConfigProvider = (arrangements: any[] = [makeRawArrangement()]) => ({
  getRawStaticArrangements: jest.fn().mockReturnValue(arrangements),
});

const makeCustomStore = (arrangements: any[] = []) => ({
  getRawArrangements: jest.fn().mockReturnValue(arrangements),
});

const makeDomainBook = (overrides: any = {}): any => ({
  bookId: "GEN",
  type: "complete",
  author: "Moses",
  chaptersVerseCount: [31],
  relativeDateRange: { min: -1440, max: -1400 },
  numberOfChapters: 1,
  customColor: "#ff0000",
  path: {
    arrangementName: "Canonical",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
  ...overrides,
});

const makeBookInfoMapper = () => ({
  toDomain: jest.fn().mockReturnValue(makeDomainBook()),
  toInfrastructure: jest.fn(),
});

const makePath = (overrides: any = {}): any => ({
  arrangementName: "Canonical",
  testamentIndex: 0,
  sectionIndex: 0,
  ...overrides,
});

const makeMapper = ({
  bookInfoMapper = makeBookInfoMapper(),
  configProvider = makeConfigProvider(),
  customStore = makeCustomStore(),
} = {}) => ({
  mapper: new SectionInfoMapper({
    bookInfoMapper: bookInfoMapper as any,
    arrangementConfigProviderPort: configProvider,
    customArrangementStorePort: customStore,
  }),
  bookInfoMapper,
  configProvider,
  customStore,
});

const makeDomainSection = (overrides: any = {}): any => ({
  name: "Law",
  color: "#00ff00",
  translationKey: "section.law",
  path: makePath(),
  books: [makeDomainBook()],
  ...overrides,
});

// ─── toDomain ─────────────────────────────────────────────────────────────────

describe("toDomain", () => {
  it("maps name from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeRawSection({ name: "Wisdom" }), makePath()).name
    ).toBe("Wisdom");
  });

  it("maps color from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeRawSection({ color: "#abc123" }), makePath()).color
    ).toBe("#abc123");
  });

  it("attaches the provided path", () => {
    const { mapper } = makeMapper();
    const path = makePath({
      arrangementName: "Thematic",
      testamentIndex: 1,
      sectionIndex: 2,
    });
    expect(mapper.toDomain(makeRawSection(), path).path).toEqual(path);
  });

  it("maps translationKey from info", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeRawSection({ translationKey: "my.key" }), makePath())
        .translationKey
    ).toBe("my.key");
  });

  it("maps translationKey as undefined when not set", () => {
    const { mapper } = makeMapper();
    const section = makeRawSection();
    delete section.translationKey;
    expect(mapper.toDomain(section, makePath()).translationKey).toBeUndefined();
  });

  it("calls bookInfoMapper.toDomain once per book", () => {
    const bookInfoMapper = makeBookInfoMapper();
    const { mapper } = makeMapper({ bookInfoMapper });
    const section = makeRawSection({ books: [makeRawBook(), makeRawBook()] });
    mapper.toDomain(section, makePath());
    expect(bookInfoMapper.toDomain).toHaveBeenCalledTimes(2);
  });

  it("calls bookInfoMapper.toDomain with each book and its bookIndex merged into path", () => {
    const bookInfoMapper = makeBookInfoMapper();
    const { mapper } = makeMapper({ bookInfoMapper });
    const book0 = makeRawBook({ name: "GEN" });
    const book1 = makeRawBook({ name: "EXO" });
    const path = makePath({
      arrangementName: "Canonical",
      testamentIndex: 0,
      sectionIndex: 1,
    });
    mapper.toDomain(makeRawSection({ books: [book0, book1] }), path);
    expect(bookInfoMapper.toDomain).toHaveBeenNthCalledWith(1, book0, {
      ...path,
      bookIndex: 0,
    });
    expect(bookInfoMapper.toDomain).toHaveBeenNthCalledWith(2, book1, {
      ...path,
      bookIndex: 1,
    });
  });

  it("returns the books array built from bookInfoMapper results", () => {
    const domainBook0 = makeDomainBook({ bookId: "GEN" });
    const domainBook1 = makeDomainBook({ bookId: "EXO" });
    const bookInfoMapper = makeBookInfoMapper();
    bookInfoMapper.toDomain
      .mockReturnValueOnce(domainBook0)
      .mockReturnValueOnce(domainBook1);
    const { mapper } = makeMapper({ bookInfoMapper });
    const result = mapper.toDomain(
      makeRawSection({ books: [makeRawBook(), makeRawBook()] }),
      makePath()
    );
    expect(result.books).toEqual([domainBook0, domainBook1]);
  });

  it("returns an empty books array when info has no books", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeRawSection({ books: [] }), makePath()).books
    ).toEqual([]);
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls getRawStaticArrangements", () => {
    const configProvider = makeConfigProvider();
    const { mapper } = makeMapper({ configProvider });
    mapper.toInfrastructure(makeDomainSection());
    expect(configProvider.getRawStaticArrangements).toHaveBeenCalled();
  });

  it("returns the section from static arrangements", () => {
    const rawSection = makeRawSection({ name: "Law" });
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [makeRawTestament({ sections: [rawSection] })],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    expect(mapper.toInfrastructure(makeDomainSection())).toBe(rawSection);
  });

  it("falls back to custom arrangements when static search fails", () => {
    const rawSection = makeRawSection({ name: "Law" });
    const customArrangement = makeRawArrangement({
      name: "Custom",
      testaments: [makeRawTestament({ sections: [rawSection] })],
    });
    const customStore = makeCustomStore([customArrangement]);
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([]),
      customStore,
    });
    const section = makeDomainSection({
      path: makePath({ arrangementName: "Custom" }),
    });
    expect(mapper.toInfrastructure(section)).toBe(rawSection);
  });

  it("does not call getRawArrangements when static search succeeds", () => {
    const customStore = makeCustomStore();
    const { mapper } = makeMapper({ customStore });
    mapper.toInfrastructure(makeDomainSection());
    expect(customStore.getRawArrangements).not.toHaveBeenCalled();
  });

  it("throws when arrangement is not found in static or custom", () => {
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([]),
      customStore: makeCustomStore([]),
    });
    expect(() => mapper.toInfrastructure(makeDomainSection())).toThrow(
      "SectionInfoMapper: foundArrangement not found at toInfrastructure"
    );
  });

  it("uses testamentIndex to locate the correct testament", () => {
    const targetSection = makeRawSection({ name: "Letters" });
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [
        makeRawTestament({ sections: [makeRawSection({ name: "Law" })] }),
        makeRawTestament({ sections: [targetSection] }),
      ],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    const section = makeDomainSection({
      path: makePath({ testamentIndex: 1 }),
    });
    expect(mapper.toInfrastructure(section)).toBe(targetSection);
  });

  it("uses sectionIndex to locate the correct section", () => {
    const targetSection = makeRawSection({ name: "Prophets" });
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [
        makeRawTestament({
          sections: [makeRawSection({ name: "Law" }), targetSection],
        }),
      ],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    const section = makeDomainSection({ path: makePath({ sectionIndex: 1 }) });
    expect(mapper.toInfrastructure(section)).toBe(targetSection);
  });

  it("throws when the section at the path indices does not exist", () => {
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [makeRawTestament({ sections: [] })],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    expect(() => mapper.toInfrastructure(makeDomainSection())).toThrow(
      "SectionInfoMapper: infrastructureInfo not found at toInfrastructure"
    );
  });

  it("throws when the testament at testamentIndex does not exist", () => {
    const arrangement = makeRawArrangement({
      name: "Canonical",
      testaments: [makeRawTestament()],
    });
    const { mapper } = makeMapper({
      configProvider: makeConfigProvider([arrangement]),
    });
    const section = makeDomainSection({
      path: makePath({ testamentIndex: 5 }),
    });
    expect(() => mapper.toInfrastructure(section)).toThrow(
      "SectionInfoMapper: infrastructureInfo not found at toInfrastructure"
    );
  });
});
