import { render } from "preact";
import { act } from "preact/test-utils";
import { useTestamentContent } from "scriptureMap.hooks.useTestamentContent";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import { useTestamentContext } from "scriptureMap.contexts.Testament.TestamentContext";
import { useReadingHistoryContext } from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";
import { applyTranslationRule } from "bibleVizUtils.domain.functions.string";

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  useScriptureMapContext: jest.fn(),
}));

jest.mock("scriptureMap.contexts.Testament.TestamentContext", () => ({
  useTestamentContext: jest.fn(),
}));

jest.mock("scriptureMap.contexts.ReadingHistory.ReadingHistoryContext", () => ({
  useReadingHistoryContext: jest.fn(),
}));

jest.mock("seed-bible.managers.ReadingHistoryManager", () => ({
  calculateReadingHistorySummary: jest.fn(() => ({
    totalTimeSpentReading: 0,
    users: {},
  })),
}));

jest.mock("bibleVizUtils.domain.functions.string", () => ({
  applyTranslationRule: jest.fn(
    (_rule: unknown, vars: { name: string }) => `translated:${vars.name}`
  ),
}));

// ---- Data helpers ----

function makeCompleteBook(overrides: Record<string, unknown> = {}) {
  return {
    type: "complete" as const,
    bookId: "GEN",
    numberOfChapters: 3,
    chaptersVerseCount: [31, 25, 24],
    author: "Moses",
    relativeDateRange: { min: 0, max: 500 },
    group: undefined,
    customColor: undefined,
    customLabelColor: undefined,
    isCheckpoint: false,
    ...overrides,
  };
}

function makeSubsetBook(overrides: Record<string, unknown> = {}) {
  return {
    type: "subset" as const,
    bookId: "PSA1",
    completeBookId: "PSA",
    startIndex: 0,
    numberOfChapters: 50,
    chaptersVerseCount: Array(50).fill(30),
    author: "David",
    relativeDateRange: { min: 0, max: 500 },
    group: undefined,
    customColor: undefined,
    customLabelColor: undefined,
    isCheckpoint: false,
    translationRule: undefined,
    ...overrides,
  };
}

function makeSection(name: string, books: unknown[]) {
  return { name, color: "#aabbcc", books };
}

function makeInfraSection(section: {
  name: string;
  color: string;
  books: unknown[];
}) {
  return {
    name: section.name,
    color: section.color,
    customColorRange: undefined,
    books: section.books.map((b: any) => ({
      bookId: b.bookId,
      type: b.type,
      completeBookId: b.completeBookId,
      startIndex: b.startIndex,
      customColor: b.customColor,
      group: undefined,
      customLabelColor: undefined,
      isCheckpoint: false,
    })),
  };
}

// ---- Context helpers ----

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    arrangementIndex: 0,
    showSectionLabels: false,
    isUserPresenceEnabled: false,
    activeTab: undefined,
    usersColors: [],
    userPresence: new Map(),
    ComputeRawGradientColors: jest.fn(() => "linear-gradient(red)"),
    userColorStore: { getUserColor: jest.fn(() => "#aabbcc") },
    sectionInfoMapper: {
      toInfrastructure: jest.fn((section: any) => makeInfraSection(section)),
    },
    arrangementService: {
      getArrangementByIndex: jest.fn(() => ({ name: "default" })),
    },
    HexToRgb: jest.fn(() => ({ r: 170, g: 187, b: 204 })),
    GetChildrenLevelColors: jest.fn(() => ["#cc0000", "#bb0000", "#aa0000"]),
    bookNames: {
      value: new Map([
        ["GEN", "Genesis"],
        ["PSA", "Psalms"],
      ]),
    },
    ...overrides,
  } as never;
}

function makeReadingHistoryCtx(overrides: Record<string, unknown> = {}) {
  return {
    rangedReadingEventsByBook: new Map(),
    readingHistoryRangeSeconds: null,
    SEC_PER_MINUTE: 60,
    ...overrides,
  } as never;
}

function makeTestamentCtx(sections: unknown[] = []) {
  return {
    testament: { name: "OT", sections },
    testamentIndex: 0,
  } as never;
}

// ---- Test suite ----

describe("useTestamentContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapContext as jest.Mock).mockReturnValue(makeCtx());
    (useReadingHistoryContext as jest.Mock).mockReturnValue(
      makeReadingHistoryCtx()
    );
    (useTestamentContext as jest.Mock).mockReturnValue(
      makeTestamentCtx([makeSection("Law", [makeCompleteBook()])])
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.clearAllMocks();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useTestamentContent>,
    };
    function TestComponent() {
      result.current = useTestamentContent();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("throws when arrangement name is not found", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeCtx({
        arrangementService: { getArrangementByIndex: jest.fn(() => null) },
      })
    );
    expect(() => setup()).toThrow(
      "useTestamentContent: Arrangement name not found"
    );
  });

  it("throws when arrangement returns object with no name", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeCtx({
        arrangementService: {
          getArrangementByIndex: jest.fn(() => ({ name: "" })),
        },
      })
    );
    expect(() => setup()).toThrow(
      "useTestamentContent: Arrangement name not found"
    );
  });

  it("returns empty itemsData when testament has no sections", () => {
    (useTestamentContext as jest.Mock).mockReturnValue(makeTestamentCtx([]));
    const result = setup();
    expect(result.current.itemsData).toEqual([]);
  });

  describe("showSectionLabels=false", () => {
    it("produces only booksContainer items (no sectionToggle)", () => {
      const result = setup();
      expect(result.current.itemsData).toHaveLength(1);
      expect(result.current.itemsData[0]!.type).toBe("booksContainer");
    });
  });

  describe("showSectionLabels=true", () => {
    beforeEach(() => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ showSectionLabels: true })
      );
    });

    it("produces sectionToggle followed by booksContainer", () => {
      const result = setup();
      expect(result.current.itemsData).toHaveLength(2);
      expect(result.current.itemsData[0]!.type).toBe("sectionToggle");
      expect(result.current.itemsData[1]!.type).toBe("booksContainer");
    });

    it("sectionToggle has correct key (arrangementIndex-testamentName-sectionName)", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      expect(toggle.key).toBe("0-OT-Law");
    });

    it("sectionToggle has correct sectionKey (testamentIndex-testamentName-sectionIndex-sectionName)", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      expect(toggle.sectionKey).toBe("0-OT-0-Law");
    });

    it("sectionToggle style has backgroundColor from section color with 80 alpha", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      expect(toggle.style.backgroundColor).toBe("#aabbcc80");
    });

    it("sectionToggle borderColor is primary color when section is shown", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      expect(toggle.style.borderColor).toBe("var(--sb-primary-color)");
    });

    it("sectionToggle showingContent is true initially", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      expect(toggle.showingContent).toBe(true);
    });
  });

  describe("toggleShowSection", () => {
    beforeEach(() => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ showSectionLabels: true })
      );
    });

    it("hides booksContainer when section is toggled off", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      act(() => toggle.toggleShowSection(toggle.sectionKey));
      expect(
        result.current.itemsData.find((i) => i.type === "booksContainer")
      ).toBeUndefined();
    });

    it("sets borderColor to transparent when section is hidden", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      act(() => toggle.toggleShowSection(toggle.sectionKey));
      const updatedToggle = result.current.itemsData[0] as any;
      expect(updatedToggle.style.borderColor).toBe("transparent");
    });

    it("sets showingContent to false after toggle off", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      act(() => toggle.toggleShowSection(toggle.sectionKey));
      const updatedToggle = result.current.itemsData[0] as any;
      expect(updatedToggle.showingContent).toBe(false);
    });

    it("re-toggling shows booksContainer again", () => {
      const result = setup();
      const toggle = result.current.itemsData[0] as any;
      act(() => toggle.toggleShowSection(toggle.sectionKey));
      const hiddenToggle = result.current.itemsData[0] as any;
      act(() => hiddenToggle.toggleShowSection(hiddenToggle.sectionKey));
      expect(
        result.current.itemsData.find((i) => i.type === "booksContainer")
      ).toBeDefined();
    });
  });

  describe("booksContainer book data", () => {
    function getFirstBook() {
      const result = setup();
      const container = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      return container.content[0];
    }

    it("book name comes from bookNames.value map", () => {
      expect(getFirstBook().book).toBe("Genesis");
    });

    it("falls back to bookId when bookName is not in map", () => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ bookNames: { value: new Map() } })
      );
      expect(getFirstBook().book).toBe("GEN");
    });

    it("bookId is set correctly", () => {
      expect(getFirstBook().bookId).toBe("GEN");
    });

    it("isSubset is false for complete books", () => {
      expect(getFirstBook().isSubset).toBe(false);
    });

    it("subsetStartIndex is undefined for complete books", () => {
      expect(getFirstBook().subsetStartIndex).toBeUndefined();
    });

    it("numberOfChapters matches book definition", () => {
      expect(getFirstBook().numberOfChapters).toBe(3);
    });

    it("isSubset is true for subset books", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([makeSection("Poetry", [makeSubsetBook()])])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].isSubset).toBe(true);
    });

    it("subsetStartIndex is set for subset books", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [makeSubsetBook({ startIndex: 10 })]),
        ])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 11-60"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].subsetStartIndex).toBe(10);
    });

    it("uses customColor when defined", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Law", [makeCompleteBook({ customColor: "#custom1" })]),
        ])
      );
      expect(getFirstBook().bookCoverBackgroundColor).toBe("#custom1");
    });

    it("uses reversed level color from GetChildrenLevelColors when no customColor", () => {
      // GetChildrenLevelColors returns ["#cc0000", "#bb0000", "#aa0000"]
      // reversed → ["#aa0000", "#bb0000", "#cc0000"]
      // bookIndex 0 → "#aa0000"
      expect(getFirstBook().bookCoverBackgroundColor).toBe("#aa0000");
    });

    it("falls back to '#000000' when GetChildrenLevelColors returns empty array", () => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ GetChildrenLevelColors: jest.fn(() => []) })
      );
      expect(getFirstBook().bookCoverBackgroundColor).toBe("#000000");
    });

    it("applies translationRule for subset books with rule defined", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ translationRule: { template: "{name} Part 1" } }),
          ]),
        ])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(applyTranslationRule).toHaveBeenCalled();
      expect(c.content[0].book).toBe("translated:Psalms");
    });

    it("uses subset bookId as fallback when bookNames has no entry and no translationRule", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([makeSection("Poetry", [makeSubsetBook()])])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ bookNames: { value: new Map() } })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      // No translationRule → uses bookNames.get(bookId) ?? bookId → "PSA1"
      expect(c.content[0].book).toBe("PSA1");
    });

    it("sectionName matches the section", () => {
      expect(getFirstBook().sectionName).toBe("Law");
    });
  });

  describe("readingEvents in booksContainer", () => {
    it("complete book gets events from rangedReadingEventsByBook by bookId", () => {
      const events = [{ start: 0, end: 120, chapter: 1 }];
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([["GEN", events]]),
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].readingEvents).toEqual(events);
    });

    it("complete book gets empty array when not in rangedReadingEventsByBook", () => {
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].readingEvents).toEqual([]);
    });

    it("subset book filters events by chapter range from completeBookId", () => {
      const events = [
        { start: 0, end: 120, chapter: 1 }, // in range 1-50
        { start: 120, end: 240, chapter: 51 }, // outside range
        { start: 240, end: 360, chapter: 50 }, // boundary, in range
      ];
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ startIndex: 0, numberOfChapters: 50 }),
          ]),
        ])
      );
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([["PSA", events]]),
        })
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].readingEvents).toHaveLength(2);
      expect(c.content[0].readingEvents).toContainEqual({
        start: 0,
        end: 120,
        chapter: 1,
      });
      expect(c.content[0].readingEvents).toContainEqual({
        start: 240,
        end: 360,
        chapter: 50,
      });
    });

    it("subset book with non-zero startIndex filters chapter range correctly", () => {
      const events = [
        { start: 0, end: 120, chapter: 50 }, // in range 51-100 (startIndex=50)? no, startIndex=50 → chapters 51-100. 50 is NOT in range.
        { start: 120, end: 240, chapter: 51 }, // in range
        { start: 240, end: 360, chapter: 100 }, // in range (boundary)
        { start: 360, end: 480, chapter: 101 }, // out of range
      ];
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ startIndex: 50, numberOfChapters: 50 }),
          ]),
        ])
      );
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([["PSA", events]]),
        })
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 51-100"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      // startIndex=50 → startingChapter=51, endChapter=100
      expect(c.content[0].readingEvents).toHaveLength(2);
    });

    it("subset book gets empty array when completeBookId not in rangedReadingEventsByBook", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([makeSection("Poetry", [makeSubsetBook()])])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ bookNames: { value: new Map([["PSA1", "Psalms 1-50"]]) } })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].readingEvents).toEqual([]);
    });
  });

  describe("filteredSections with readingHistoryRangeSeconds", () => {
    const range = { start: 0, end: 604800 };

    it("includes complete book when total reading time >= SEC_PER_MINUTE", () => {
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([
            ["GEN", [{ start: 0, end: 120, chapter: 1 }]],
          ]),
          readingHistoryRangeSeconds: range,
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c).toBeDefined();
      expect(c.content).toHaveLength(1);
    });

    it("excludes complete book when reading time < SEC_PER_MINUTE", () => {
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([
            ["GEN", [{ start: 0, end: 30, chapter: 1 }]],
          ]),
          readingHistoryRangeSeconds: range,
        })
      );
      const result = setup();
      expect(result.current.itemsData).toHaveLength(0);
    });

    it("excludes complete book when it has no events in rangedReadingEventsByBook", () => {
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map(),
          readingHistoryRangeSeconds: range,
        })
      );
      const result = setup();
      expect(result.current.itemsData).toHaveLength(0);
    });

    it("excludes section entirely when none of its books qualify", () => {
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([
            ["GEN", [{ start: 0, end: 10, chapter: 1 }]],
          ]),
          readingHistoryRangeSeconds: range,
        })
      );
      const result = setup();
      expect(result.current.itemsData).toHaveLength(0);
    });

    it("includes subset book when chapter-range events have sufficient time", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ startIndex: 0, numberOfChapters: 50 }),
          ]),
        ])
      );
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([
            ["PSA", [{ start: 0, end: 120, chapter: 1 }]],
          ]),
          readingHistoryRangeSeconds: range,
        })
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      expect(
        result.current.itemsData.find((i) => i.type === "booksContainer")
      ).toBeDefined();
    });

    it("excludes subset book when chapter-range events have insufficient time", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ startIndex: 0, numberOfChapters: 50 }),
          ]),
        ])
      );
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([
            ["PSA", [{ start: 0, end: 30, chapter: 1 }]],
          ]),
          readingHistoryRangeSeconds: range,
        })
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      expect(result.current.itemsData).toHaveLength(0);
    });

    it("excludes subset book when all events are outside its chapter range", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ startIndex: 0, numberOfChapters: 50 }),
          ]),
        ])
      );
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([
            ["PSA", [{ start: 0, end: 200, chapter: 100 }]],
          ]),
          readingHistoryRangeSeconds: range,
        })
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      expect(result.current.itemsData).toHaveLength(0);
    });

    it("excludes subset book when completeBookId has no events", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([makeSection("Poetry", [makeSubsetBook()])])
      );
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map(),
          readingHistoryRangeSeconds: range,
        })
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ bookNames: { value: new Map([["PSA1", "Psalms 1-50"]]) } })
      );
      const result = setup();
      expect(result.current.itemsData).toHaveLength(0);
    });

    it("only qualifying books are included in booksContainer when section has mixed books", () => {
      const section = makeSection("Mixed", [
        makeCompleteBook({ bookId: "GEN" }),
        makeCompleteBook({ bookId: "EXO", numberOfChapters: 40 }),
      ]);
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([section])
      );
      (useReadingHistoryContext as jest.Mock).mockReturnValue(
        makeReadingHistoryCtx({
          rangedReadingEventsByBook: new Map([
            ["GEN", [{ start: 0, end: 120, chapter: 1 }]], // qualifies
            // EXO has no events → excluded
          ]),
          readingHistoryRangeSeconds: range,
        })
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["GEN", "Genesis"],
              ["EXO", "Exodus"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c).toBeDefined();
      expect(c.content).toHaveLength(1);
      expect(c.content[0].bookId).toBe("GEN");
    });
  });

  describe("user presence", () => {
    it("bookUserPresence is empty when isUserPresenceEnabled=false", () => {
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookUserPresence).toEqual({});
    });

    it("bookBorderGradientColors is undefined when isUserPresenceEnabled=false", () => {
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookBorderGradientColors).toBeUndefined();
    });

    it("adds matching user to bookUserPresence", () => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([["user1", { chapter: 2, bookId: "GEN" }]]),
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookUserPresence.user1).toEqual({
        chapter: 2,
        borderColor: "#aabbcc",
      });
    });

    it("does not add user whose bookId does not match", () => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([["user1", { chapter: 2, bookId: "EXO" }]]),
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookUserPresence).toEqual({});
    });

    it("adds multiple users when multiple match", () => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([
            ["user1", { chapter: 1, bookId: "GEN" }],
            ["user2", { chapter: 3, bookId: "GEN" }],
          ]),
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(Object.keys(c.content[0].bookUserPresence)).toHaveLength(2);
    });

    it("sets bookBorderGradientColors when users match", () => {
      const computeFn = jest.fn(() => "linear-gradient(#aabbcc)");
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([["user1", { chapter: 1, bookId: "GEN" }]]),
          ComputeRawGradientColors: computeFn,
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(computeFn).toHaveBeenCalledWith({
        colors: ["#aabbcc"],
        diffuse: 15,
      });
      expect(c.content[0].bookBorderGradientColors).toBe(
        "linear-gradient(#aabbcc)"
      );
    });

    it("bookBorderGradientColors is undefined when no users match", () => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({ isUserPresenceEnabled: true, userPresence: new Map() })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookBorderGradientColors).toBeUndefined();
    });

    it("adds user to subset book bookUserPresence when chapter is in range", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ startIndex: 0, numberOfChapters: 50 }),
          ]),
        ])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([["user1", { chapter: 25, bookId: "PSA" }]]),
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookUserPresence.user1).toBeDefined();
    });

    it("does not add user to subset book when chapter is outside range", () => {
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([
          makeSection("Poetry", [
            makeSubsetBook({ startIndex: 0, numberOfChapters: 50 }),
          ]),
        ])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([["user1", { chapter: 75, bookId: "PSA" }]]),
          bookNames: {
            value: new Map([
              ["PSA1", "Psalms 1-50"],
              ["PSA", "Psalms"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookUserPresence).toEqual({});
    });

    it("user color comes from userColorStore.getUserColor", () => {
      const getUserColor = jest.fn(() => "#ff1234");
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([["user1", { chapter: 1, bookId: "GEN" }]]),
          userColorStore: { getUserColor },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(getUserColor).toHaveBeenCalledWith({ configId: "user1" });
      expect(c.content[0].bookUserPresence.user1.borderColor).toBe("#ff1234");
    });

    it("falls back to '#000000' borderColor when getUserColor returns null", () => {
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          isUserPresenceEnabled: true,
          userPresence: new Map([["user1", { chapter: 1, bookId: "GEN" }]]),
          userColorStore: { getUserColor: jest.fn(() => null) },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      expect(c.content[0].bookUserPresence.user1.borderColor).toBe("#000000");
    });
  });

  describe("multiple sections", () => {
    it("produces a booksContainer for each section", () => {
      const sections = [
        makeSection("Law", [makeCompleteBook({ bookId: "GEN" })]),
        makeSection("Prophets", [makeCompleteBook({ bookId: "ISA" })]),
      ];
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx(sections)
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          showSectionLabels: true,
          bookNames: {
            value: new Map([
              ["GEN", "Genesis"],
              ["ISA", "Isaiah"],
            ]),
          },
        })
      );
      const result = setup();
      const containers = result.current.itemsData.filter(
        (i) => i.type === "booksContainer"
      ) as any[];
      expect(containers).toHaveLength(2);
    });

    it("sections appear in reversed order (last section first in itemsData)", () => {
      const sections = [
        makeSection("Law", [makeCompleteBook({ bookId: "GEN" })]),
        makeSection("Prophets", [makeCompleteBook({ bookId: "ISA" })]),
      ];
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx(sections)
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          showSectionLabels: true,
          bookNames: {
            value: new Map([
              ["GEN", "Genesis"],
              ["ISA", "Isaiah"],
            ]),
          },
        })
      );
      const result = setup();
      const containers = result.current.itemsData.filter(
        (i) => i.type === "booksContainer"
      ) as any[];
      // toReversed() → Prophets (ISA) is at index 0, Law (GEN) at index 1
      expect(containers[0].content[0].bookId).toBe("ISA");
      expect(containers[1].content[0].bookId).toBe("GEN");
    });

    it("books within a section are also reversed", () => {
      const section = makeSection("Law", [
        makeCompleteBook({ bookId: "GEN" }),
        makeCompleteBook({ bookId: "EXO", numberOfChapters: 40 }),
      ]);
      (useTestamentContext as jest.Mock).mockReturnValue(
        makeTestamentCtx([section])
      );
      (useScriptureMapContext as jest.Mock).mockReturnValue(
        makeCtx({
          bookNames: {
            value: new Map([
              ["GEN", "Genesis"],
              ["EXO", "Exodus"],
            ]),
          },
        })
      );
      const result = setup();
      const c = result.current.itemsData.find(
        (i) => i.type === "booksContainer"
      ) as any;
      // toReversed() → EXO first, GEN second
      expect(c.content[0].bookId).toBe("EXO");
      expect(c.content[1].bookId).toBe("GEN");
    });
  });
});
