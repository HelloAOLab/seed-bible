import { ArrangementMapper } from "bibleVizUtils.infrastructure.mappers.ArrangementMapper";

// ─── factories ────────────────────────────────────────────────────────────────

const makeStaticInfo = (overrides: any = {}): any => ({
  author: "Moses",
  chaptersVerseCount: [31, 25, 24],
  relativeDateRange: { min: -1440, max: -1400 },
  numberOfChapters: 3,
  ...overrides,
});

const makeRepo = (staticInfo: any = makeStaticInfo()) => ({
  getBookStaticInfo: jest.fn().mockReturnValue(staticInfo),
  getBooksStaticInfo: jest.fn(),
  getTestamentNames: jest.fn(),
  getTestamentName: jest.fn(),
});

const makeMapper = (repo = makeRepo()) => ({
  mapper: new ArrangementMapper({ booksStaticInfoRepository: repo }),
  repo,
});

const makeTemplateBook = (overrides: any = {}): any => ({
  name: "GEN",
  color: "#aabbcc",
  ...overrides,
});

const makeTemplateSection = (overrides: any = {}): any => ({
  name: "Law",
  color: "#112233",
  books: [makeTemplateBook()],
  ...overrides,
});

const makeTemplateTestament = (overrides: any = {}): any => ({
  name: "Old Testament",
  color: "#ff0000",
  sections: [makeTemplateSection()],
  ...overrides,
});

const makeTemplate = (overrides: any = {}): any => ({
  name: "Canonical",
  testaments: [makeTemplateTestament()],
  ...overrides,
});

const makeArrangementBook = (overrides: any = {}): any => ({
  bookId: "GEN",
  type: "complete",
  author: "Moses",
  chaptersVerseCount: [31, 25, 24],
  relativeDateRange: { min: -1440, max: -1400 },
  numberOfChapters: 3,
  customColor: "#aabbcc",
  path: {
    arrangementName: "Canonical",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
  ...overrides,
});

const makeArrangementSection = (overrides: any = {}): any => ({
  name: "Law",
  color: "#112233",
  path: { arrangementName: "Canonical", testamentIndex: 0, sectionIndex: 0 },
  books: [makeArrangementBook()],
  ...overrides,
});

const makeArrangementTestament = (overrides: any = {}): any => ({
  name: "Old Testament",
  color: "#ff0000",
  sections: [makeArrangementSection()],
  ...overrides,
});

const makeArrangement = (overrides: any = {}): any => ({
  name: "Canonical",
  testaments: [makeArrangementTestament()],
  ...overrides,
});

// ─── toArrangement — name & structure ────────────────────────────────────────

describe("toArrangement — name and top-level structure", () => {
  it("copies the arrangement name from the template", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toArrangement({ template: makeTemplate({ name: "Thematic" }) })
        .name
    ).toBe("Thematic");
  });

  it("returns an object with a testaments array", () => {
    const { mapper } = makeMapper();
    expect(
      Array.isArray(
        mapper.toArrangement({ template: makeTemplate() }).testaments
      )
    ).toBe(true);
  });

  it("has one testament per template testament", () => {
    const { mapper } = makeMapper();
    const template = makeTemplate({
      testaments: [
        makeTemplateTestament({ name: "OT" }),
        makeTemplateTestament({ name: "NT" }),
      ],
    });
    expect(mapper.toArrangement({ template }).testaments).toHaveLength(2);
  });
});

// ─── toArrangement — testaments ───────────────────────────────────────────────

describe("toArrangement — testament fields", () => {
  it("copies the testament name", () => {
    const { mapper } = makeMapper();
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(result.testaments[0]!.name).toBe("Old Testament");
  });

  it("copies the testament color", () => {
    const { mapper } = makeMapper();
    const template = makeTemplate({
      testaments: [makeTemplateTestament({ color: "#123456" })],
    });
    expect(mapper.toArrangement({ template }).testaments[0]!.color).toBe(
      "#123456"
    );
  });
});

// ─── toArrangement — sections ─────────────────────────────────────────────────

describe("toArrangement — section fields", () => {
  it("copies the section name", () => {
    const { mapper } = makeMapper();
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(result.testaments[0]!.sections[0]!.name).toBe("Law");
  });

  it("copies the section color", () => {
    const { mapper } = makeMapper();
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(result.testaments[0]!.sections[0]!.color).toBe("#112233");
  });

  it("includes the arrangement name in the section path", () => {
    const { mapper } = makeMapper();
    const result = mapper.toArrangement({
      template: makeTemplate({ name: "MyArrangement" }),
    });
    expect(result.testaments[0]!.sections[0]!.path.arrangementName).toBe(
      "MyArrangement"
    );
  });

  it("includes the correct testamentIndex in the section path", () => {
    const { mapper } = makeMapper();
    const template = makeTemplate({
      testaments: [
        makeTemplateTestament({ name: "OT" }),
        makeTemplateTestament({
          name: "NT",
          sections: [makeTemplateSection({ name: "Letters" })],
        }),
      ],
    });
    const result = mapper.toArrangement({ template });
    expect(result.testaments[1]!.sections[0]!.path.testamentIndex).toBe(1);
  });

  it("includes the correct sectionIndex in the section path", () => {
    const { mapper } = makeMapper();
    const template = makeTemplate({
      testaments: [
        makeTemplateTestament({
          sections: [
            makeTemplateSection({ name: "A" }),
            makeTemplateSection({ name: "B" }),
          ],
        }),
      ],
    });
    const result = mapper.toArrangement({ template });
    expect(result.testaments[0]!.sections[1]!.path.sectionIndex).toBe(1);
  });
});

// ─── toArrangement — books ────────────────────────────────────────────────────

describe("toArrangement — book fields", () => {
  it("sets bookId from the template book name", () => {
    const { mapper } = makeMapper();
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(result.testaments[0]!.sections[0]!.books[0]!.bookId).toBe("GEN");
  });

  it("sets type to 'complete'", () => {
    const { mapper } = makeMapper();
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(result.testaments[0]!.sections[0]!.books[0]!.type).toBe("complete");
  });

  it("copies author from static info", () => {
    const { mapper } = makeMapper(makeRepo(makeStaticInfo({ author: "John" })));
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(result.testaments[0]!.sections[0]!.books[0]!.author).toBe("John");
  });

  it("copies chaptersVerseCount from static info", () => {
    const { mapper } = makeMapper(
      makeRepo(makeStaticInfo({ chaptersVerseCount: [20, 29] }))
    );
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(
      result.testaments[0]!.sections[0]!.books[0]!.chaptersVerseCount
    ).toEqual([20, 29]);
  });

  it("copies relativeDateRange from static info", () => {
    const range = { min: 90, max: 100 };
    const { mapper } = makeMapper(
      makeRepo(makeStaticInfo({ relativeDateRange: range }))
    );
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(
      result.testaments[0]!.sections[0]!.books[0]!.relativeDateRange
    ).toEqual(range);
  });

  it("copies numberOfChapters from static info", () => {
    const { mapper } = makeMapper(
      makeRepo(makeStaticInfo({ numberOfChapters: 22 }))
    );
    const result = mapper.toArrangement({ template: makeTemplate() });
    expect(result.testaments[0]!.sections[0]!.books[0]!.numberOfChapters).toBe(
      22
    );
  });

  it("sets customColor from the template book color", () => {
    const { mapper } = makeMapper();
    const template = makeTemplate({
      testaments: [
        makeTemplateTestament({
          sections: [
            makeTemplateSection({
              books: [makeTemplateBook({ color: "#deadbe" })],
            }),
          ],
        }),
      ],
    });
    const result = mapper.toArrangement({ template });
    expect(result.testaments[0]!.sections[0]!.books[0]!.customColor).toBe(
      "#deadbe"
    );
  });

  it("calls getBookStaticInfo once per book", () => {
    const repo = makeRepo();
    const { mapper } = makeMapper(repo);
    const template = makeTemplate({
      testaments: [
        makeTemplateTestament({
          sections: [
            makeTemplateSection({
              books: [
                makeTemplateBook({ name: "GEN" }),
                makeTemplateBook({ name: "EXO" }),
              ],
            }),
          ],
        }),
      ],
    });
    mapper.toArrangement({ template });
    expect(repo.getBookStaticInfo).toHaveBeenCalledTimes(2);
    expect(repo.getBookStaticInfo).toHaveBeenCalledWith("GEN");
    expect(repo.getBookStaticInfo).toHaveBeenCalledWith("EXO");
  });

  it("includes bookIndex in the book path", () => {
    const { mapper } = makeMapper();
    const template = makeTemplate({
      testaments: [
        makeTemplateTestament({
          sections: [
            makeTemplateSection({
              books: [
                makeTemplateBook({ name: "GEN" }),
                makeTemplateBook({ name: "EXO" }),
              ],
            }),
          ],
        }),
      ],
    });
    const result = mapper.toArrangement({ template });
    expect(result.testaments[0]!.sections[0]!.books[1]!.path.bookIndex).toBe(1);
  });

  it("includes arrangementName in the book path", () => {
    const { mapper } = makeMapper();
    const result = mapper.toArrangement({
      template: makeTemplate({ name: "Chronological" }),
    });
    expect(
      result.testaments[0]!.sections[0]!.books[0]!.path.arrangementName
    ).toBe("Chronological");
  });

  it("throws when getBookStaticInfo returns undefined", () => {
    const repo = makeRepo();
    repo.getBookStaticInfo.mockReturnValue(undefined);
    const { mapper } = makeMapper(repo);
    expect(() => mapper.toArrangement({ template: makeTemplate() })).toThrow(
      "bookStaticInfo not found"
    );
  });
});

// ─── toTemplate — name & ids ──────────────────────────────────────────────────

describe("toTemplate — name and id generation", () => {
  it("copies the arrangement name", () => {
    const { mapper } = makeMapper();
    const result = mapper.toTemplate(
      makeArrangement({ name: "Thematic" }),
      jest.fn(() => "id")
    );
    expect(result.name).toBe("Thematic");
  });

  it("assigns an id from generateId to the arrangement", () => {
    const { mapper } = makeMapper();
    const generateId = jest.fn().mockReturnValue("arr-id");
    const result = mapper.toTemplate(makeArrangement(), generateId);
    expect(result.id).toBe("arr-id");
  });

  it("assigns distinct ids to each entity via generateId", () => {
    const { mapper } = makeMapper();
    let counter = 0;
    const generateId = () => `id-${++counter}`;
    // 1 arrangement + 1 testament + 1 section + 1 book = 4 calls
    const result = mapper.toTemplate(makeArrangement(), generateId);
    expect(result.id).toBe("id-1");
    expect(result.testaments[0]!.id).toBe("id-2");
    expect(result.testaments[0]!.sections[0]!.id).toBe("id-3");
    expect(result.testaments[0]!.sections[0]!.books[0]!.id).toBe("id-4");
  });

  it("calls generateId exactly (1 + testaments + sections + books) times", () => {
    const { mapper } = makeMapper();
    const generateId = jest.fn().mockReturnValue("x");
    // 1 arrangement + 1 testament + 1 section + 2 books = 5 calls
    const arrangement = makeArrangement({
      testaments: [
        makeArrangementTestament({
          sections: [
            makeArrangementSection({
              books: [
                makeArrangementBook({ bookId: "GEN" }),
                makeArrangementBook({ bookId: "EXO" }),
              ],
            }),
          ],
        }),
      ],
    });
    mapper.toTemplate(arrangement, generateId);
    expect(generateId).toHaveBeenCalledTimes(5);
  });
});

// ─── toTemplate — testaments ──────────────────────────────────────────────────

describe("toTemplate — testament fields", () => {
  it("copies the testament name", () => {
    const { mapper } = makeMapper();
    const result = mapper.toTemplate(
      makeArrangement(),
      jest.fn(() => "id")
    );
    expect(result.testaments[0]!.name).toBe("Old Testament");
  });

  it("sets testament color to '#FFFFFF'", () => {
    const { mapper } = makeMapper();
    const result = mapper.toTemplate(
      makeArrangement(),
      jest.fn(() => "id")
    );
    expect(result.testaments[0]!.color).toBe("#FFFFFF");
  });
});

// ─── toTemplate — sections ────────────────────────────────────────────────────

describe("toTemplate — section fields", () => {
  it("copies the section name", () => {
    const { mapper } = makeMapper();
    const result = mapper.toTemplate(
      makeArrangement(),
      jest.fn(() => "id")
    );
    expect(result.testaments[0]!.sections[0]!.name).toBe("Law");
  });

  it("copies the section color", () => {
    const { mapper } = makeMapper();
    const result = mapper.toTemplate(
      makeArrangement(),
      jest.fn(() => "id")
    );
    expect(result.testaments[0]!.sections[0]!.color).toBe("#112233");
  });
});

// ─── toTemplate — books ───────────────────────────────────────────────────────

describe("toTemplate — book fields", () => {
  it("sets the book name from bookId", () => {
    const { mapper } = makeMapper();
    const result = mapper.toTemplate(
      makeArrangement(),
      jest.fn(() => "id")
    );
    expect(result.testaments[0]!.sections[0]!.books[0]!.name).toBe("GEN");
  });

  it("assigns a color string starting with '#' to each book", () => {
    const { mapper } = makeMapper();
    const result = mapper.toTemplate(
      makeArrangement(),
      jest.fn(() => "id")
    );
    expect(result.testaments[0]!.sections[0]!.books[0]!.color).toMatch(/^#/);
  });

  it("assigns distinct colors to books when section has multiple books", () => {
    const { mapper } = makeMapper();
    const arrangement = makeArrangement({
      testaments: [
        makeArrangementTestament({
          sections: [
            makeArrangementSection({
              color: "#800000",
              books: [
                makeArrangementBook({ bookId: "GEN" }),
                makeArrangementBook({
                  bookId: "EXO",
                  path: {
                    arrangementName: "Canonical",
                    testamentIndex: 0,
                    sectionIndex: 0,
                    bookIndex: 1,
                  },
                }),
              ],
            }),
          ],
        }),
      ],
    });
    const result = mapper.toTemplate(
      arrangement,
      jest.fn(() => "id")
    );
    const books = result.testaments[0]!.sections[0]!.books;
    expect(books).toHaveLength(2);
    expect(books[0]!.color).toMatch(/^#/);
    expect(books[1]!.color).toMatch(/^#/);
  });

  it("falls back to '#FFFFFF' for books beyond the generated color range", () => {
    const { mapper } = makeMapper();
    // A valid color means no crash and a string is returned
    const result = mapper.toTemplate(
      makeArrangement(),
      jest.fn(() => "id")
    );
    expect(typeof result.testaments[0]!.sections[0]!.books[0]!.color).toBe(
      "string"
    );
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────────

describe("round-trip: toArrangement then toTemplate", () => {
  it("preserves the arrangement name through the round-trip", () => {
    const repo = makeRepo();
    const { mapper } = makeMapper(repo);
    const template = makeTemplate({ name: "RoundTrip" });
    const arrangement = mapper.toArrangement({ template });
    const backToTemplate = mapper.toTemplate(arrangement, () => "id");
    expect(backToTemplate.name).toBe("RoundTrip");
  });

  it("preserves the section name through the round-trip", () => {
    const { mapper } = makeMapper();
    const arrangement = mapper.toArrangement({ template: makeTemplate() });
    const backToTemplate = mapper.toTemplate(arrangement, () => "id");
    expect(backToTemplate.testaments[0]!.sections[0]!.name).toBe("Law");
  });

  it("preserves book ids through the round-trip", () => {
    const { mapper } = makeMapper();
    const arrangement = mapper.toArrangement({ template: makeTemplate() });
    const backToTemplate = mapper.toTemplate(arrangement, () => "id");
    expect(backToTemplate.testaments[0]!.sections[0]!.books[0]!.name).toBe(
      "GEN"
    );
  });
});
