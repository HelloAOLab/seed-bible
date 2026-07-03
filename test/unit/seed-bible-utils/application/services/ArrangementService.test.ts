import { ArrangementService } from "../../../../../packages/seed-bible-utils/application/services/ArrangementService";
import type {
  ArrangementInfo,
  TestamentInfo,
  SectionInfo,
} from "../../../../../packages/seed-bible-utils/domain/models/arrangement";
import type {
  ArrangementConfigProviderPort,
  CustomArrangementStorePort,
  ArrangementEventPort,
} from "../../../../../packages/seed-bible-utils/domain/ports/arrangement";

// ─── factories ───────────────────────────────────────────────────────────────

const makeCompleteBook = (bookId = "gen"): any => ({
  bookId,
  type: "complete" as const,
  author: "Moses",
  chaptersVerseCount: [31],
  relativeDateRange: { min: -1446, max: -1406 },
  numberOfChapters: 50,
  path: {
    arrangementName: "Standard",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
});

const makeSubsetBook = (overrides: any = {}): any => ({
  bookId: "psa-1",
  type: "subset" as const,
  completeBookId: "psa",
  author: "David",
  chaptersVerseCount: [31],
  relativeDateRange: { min: -1000, max: -900 },
  numberOfChapters: 75,
  startIndex: 0,
  path: {
    arrangementName: "Standard",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
  ...overrides,
});

const makeSection = (
  name = "Pentateuch",
  books: any[] = [makeCompleteBook()]
): SectionInfo =>
  ({
    name,
    color: "#ff0000",
    books,
    path: { arrangementName: "Standard", testamentIndex: 0, sectionIndex: 0 },
  }) as any;

const makeTestament = (
  name = "Old Testament",
  sections: SectionInfo[] = [makeSection()]
): TestamentInfo => ({ name, sections }) as any;

const makeArrangement = (
  name = "Standard",
  testaments: TestamentInfo[] = [makeTestament()]
): ArrangementInfo => ({ name, testaments });

const makeConfigProvider = (
  arrangements: ArrangementInfo[] = [makeArrangement()]
): ArrangementConfigProviderPort => ({
  getStaticArrangements: () => arrangements,
});

const makeCustomStore = (
  overrides: Partial<CustomArrangementStorePort> = {}
): CustomArrangementStorePort => ({
  tryAddArrangement: vi.fn().mockReturnValue(true),
  tryRemoveArrangement: vi.fn().mockReturnValue(true),
  getArrangements: vi.fn().mockReturnValue([]),
  ...overrides,
});

const makeEventManager = (): ArrangementEventPort => ({
  emit: vi.fn(),
});

const makeService = (overrides: any = {}) =>
  new ArrangementService({
    arrangementConfigProviderPort: makeConfigProvider(),
    customArrangementStorePort: makeCustomStore(),
    eventManager: makeEventManager(),
    ...overrides,
  });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("ArrangementService", () => {
  // ─── constructor ───────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("defaults arrangementIndex to 0", () => {
      expect(makeService().getCurrentArrangementIndex()).toBe(0);
    });

    it("stores a provided arrangementIndex", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("A"),
          makeArrangement("B"),
        ]),
        arrangementIndex: 1,
      });
      expect(service.getCurrentArrangementIndex()).toBe(1);
    });
  });

  // ─── getAllArrangements ────────────────────────────────────────────────────

  describe("getAllArrangements", () => {
    it("concatenates static and custom arrangements in that order", () => {
      const staticA = makeArrangement("Static");
      const customA = makeArrangement("Custom");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([staticA]),
        customArrangementStorePort: makeCustomStore({
          getArrangements: vi.fn().mockReturnValue([customA]),
        }),
      });
      expect(service.getAllArrangements()).toEqual([staticA, customA]);
    });

    it("returns only static arrangements when no custom ones exist", () => {
      const staticA = makeArrangement("Static");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([staticA]),
      });
      expect(service.getAllArrangements()).toEqual([staticA]);
    });

    it("returns only custom arrangements when no static ones exist", () => {
      const customA = makeArrangement("Custom");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([]),
        customArrangementStorePort: makeCustomStore({
          getArrangements: vi.fn().mockReturnValue([customA]),
        }),
      });
      expect(service.getAllArrangements()).toEqual([customA]);
    });
  });

  // ─── setCurrentArrangementIndex ───────────────────────────────────────────

  describe("setCurrentArrangementIndex", () => {
    it("returns true and updates the index for a valid new index", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("A"),
          makeArrangement("B"),
        ]),
      });
      expect(service.setCurrentArrangementIndex(1)).toBe(true);
      expect(service.getCurrentArrangementIndex()).toBe(1);
    });

    it("emits OnArrangementIndexChanged with the new index on success", () => {
      const eventManager = makeEventManager();
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("A"),
          makeArrangement("B"),
        ]),
        eventManager,
      });
      service.setCurrentArrangementIndex(1);
      expect(eventManager.emit).toHaveBeenCalledWith(
        "OnArrangementIndexChanged",
        {
          newIndex: 1,
        }
      );
    });

    it("returns false and does not update when index is negative", () => {
      const service = makeService();
      expect(service.setCurrentArrangementIndex(-1)).toBe(false);
      expect(service.getCurrentArrangementIndex()).toBe(0);
    });

    it("returns false and does not update when index equals the array length", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([makeArrangement()]),
      });
      expect(service.setCurrentArrangementIndex(1)).toBe(false);
    });

    it("returns false and does not emit when index equals the current index", () => {
      const eventManager = makeEventManager();
      const service = makeService({ eventManager });
      expect(service.setCurrentArrangementIndex(0)).toBe(false);
      expect(eventManager.emit).not.toHaveBeenCalled();
    });
  });

  // ─── setArrangementIndexByName ────────────────────────────────────────────

  describe("setArrangementIndexByName", () => {
    it("sets the index to the arrangement with the given name", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Alpha"),
          makeArrangement("Beta"),
        ]),
      });
      service.setArrangementIndexByName("Beta");
      expect(service.getCurrentArrangementIndex()).toBe(1);
    });

    it("is a no-op when the name is not found", () => {
      const service = makeService();
      service.setArrangementIndexByName("NonExistent");
      expect(service.getCurrentArrangementIndex()).toBe(0);
    });

    it("is a no-op when already at the named arrangement", () => {
      const eventManager = makeEventManager();
      const service = makeService({ eventManager });
      service.setArrangementIndexByName("Standard");
      expect(eventManager.emit).not.toHaveBeenCalled();
    });
  });

  // ─── getArrangementIndexByName ────────────────────────────────────────────

  describe("getArrangementIndexByName", () => {
    it("returns the index of the matching arrangement", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Alpha"),
          makeArrangement("Beta"),
        ]),
      });
      expect(service.getArrangementIndexByName("Beta")).toBe(1);
    });

    it("returns -1 when the name is not found", () => {
      expect(makeService().getArrangementIndexByName("Missing")).toBe(-1);
    });
  });

  // ─── getCurrentArrangement / getCurrentArrangementName ────────────────────

  describe("getCurrentArrangement / getCurrentArrangementName", () => {
    it("getCurrentArrangement returns the arrangement at the current index", () => {
      const arrangement = makeArrangement("MyArrangement");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([arrangement]),
      });
      expect(service.getCurrentArrangement()).toBe(arrangement);
    });

    it("getCurrentArrangementName returns the name of the current arrangement", () => {
      expect(makeService().getCurrentArrangementName()).toBe("Standard");
    });
  });

  // ─── addCustomArrangement ─────────────────────────────────────────────────

  describe("addCustomArrangement", () => {
    it("calls tryAddArrangement on the store", () => {
      const customStore = makeCustomStore();
      const service = makeService({ customArrangementStorePort: customStore });
      const newArrangement = makeArrangement("Custom");
      service.addCustomArrangement(newArrangement);
      expect(customStore.tryAddArrangement).toHaveBeenCalledWith(
        newArrangement
      );
    });

    it("emits OnCustomArrangementsChanged when tryAddArrangement succeeds", () => {
      const eventManager = makeEventManager();
      const service = makeService({ eventManager });
      service.addCustomArrangement(makeArrangement("Custom"));
      expect(eventManager.emit).toHaveBeenCalledWith(
        "OnCustomArrangementsChanged"
      );
    });

    it("does not emit when tryAddArrangement returns false", () => {
      const eventManager = makeEventManager();
      const service = makeService({
        eventManager,
        customArrangementStorePort: makeCustomStore({
          tryAddArrangement: vi.fn().mockReturnValue(false),
        }),
      });
      service.addCustomArrangement(makeArrangement("Custom"));
      expect(eventManager.emit).not.toHaveBeenCalled();
    });
  });

  // ─── removeCustomArrangement ──────────────────────────────────────────────

  describe("removeCustomArrangement", () => {
    it("calls tryRemoveArrangement on the store", () => {
      const customStore = makeCustomStore();
      const service = makeService({ customArrangementStorePort: customStore });
      const target = makeArrangement("Custom");
      service.removeCustomArrangement(target);
      expect(customStore.tryRemoveArrangement).toHaveBeenCalledWith(target);
    });

    it("emits OnCustomArrangementsChanged when tryRemoveArrangement succeeds", () => {
      const eventManager = makeEventManager();
      const service = makeService({ eventManager });
      service.removeCustomArrangement(makeArrangement("Other"));
      expect(eventManager.emit).toHaveBeenCalledWith(
        "OnCustomArrangementsChanged"
      );
    });

    it("resets index to 0 when the removed arrangement is the current one", () => {
      const customArrangement = makeArrangement("Custom");
      const customStore = makeCustomStore({
        getArrangements: vi.fn().mockReturnValue([customArrangement]),
        tryRemoveArrangement: vi.fn().mockReturnValue(true),
      });
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Static"),
        ]),
        customArrangementStorePort: customStore,
      });
      service.setCurrentArrangementIndex(1); // select "Custom"
      service.removeCustomArrangement(customArrangement);
      expect(service.getCurrentArrangementIndex()).toBe(0);
    });

    it("does not emit when tryRemoveArrangement returns false", () => {
      const eventManager = makeEventManager();
      const service = makeService({
        eventManager,
        customArrangementStorePort: makeCustomStore({
          tryRemoveArrangement: vi.fn().mockReturnValue(false),
        }),
      });
      service.removeCustomArrangement(makeArrangement("Custom"));
      expect(eventManager.emit).not.toHaveBeenCalled();
    });
  });

  // ─── getArrangementByIndex ────────────────────────────────────────────────

  describe("getArrangementByIndex", () => {
    it("returns the arrangement at the given index", () => {
      const a1 = makeArrangement("Alpha");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          a1,
          makeArrangement("Beta"),
        ]),
      });
      expect(service.getArrangementByIndex(0)).toBe(a1);
    });

    it("returns undefined for an out-of-bounds index", () => {
      expect(makeService().getArrangementByIndex(99)).toBeUndefined();
    });
  });

  // ─── getTestamentByIndices ────────────────────────────────────────────────

  describe("getTestamentByIndices", () => {
    it("returns the testament at the given path", () => {
      const testament = makeTestament("Old Testament");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [testament]),
        ]),
      });
      expect(
        service.getTestamentByIndices({
          arrangementIndex: 0,
          testamentIndex: 0,
        })
      ).toBe(testament);
    });

    it("returns undefined when the arrangement index is out of bounds", () => {
      expect(
        makeService().getTestamentByIndices({
          arrangementIndex: 99,
          testamentIndex: 0,
        })
      ).toBeUndefined();
    });

    it("returns undefined when the testament index is out of bounds", () => {
      expect(
        makeService().getTestamentByIndices({
          arrangementIndex: 0,
          testamentIndex: 99,
        })
      ).toBeUndefined();
    });
  });

  // ─── getSectionByIndices ──────────────────────────────────────────────────

  describe("getSectionByIndices", () => {
    it("returns the section at the given path", () => {
      const section = makeSection("Pentateuch");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [makeTestament("OT", [section])]),
        ]),
      });
      expect(
        service.getSectionByIndices({
          arrangementIndex: 0,
          testamentIndex: 0,
          sectionIndex: 0,
        })
      ).toBe(section);
    });

    it("returns undefined when the section index is out of bounds", () => {
      expect(
        makeService().getSectionByIndices({
          arrangementIndex: 0,
          testamentIndex: 0,
          sectionIndex: 99,
        })
      ).toBeUndefined();
    });
  });

  // ─── getBookByIndices ─────────────────────────────────────────────────────

  describe("getBookByIndices", () => {
    it("returns the book at the given path", () => {
      const book = makeCompleteBook("exo");
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [
            makeTestament("OT", [makeSection("Pentateuch", [book])]),
          ]),
        ]),
      });
      expect(
        service.getBookByIndices({
          arrangementIndex: 0,
          testamentIndex: 0,
          sectionIndex: 0,
          bookIndex: 0,
        })
      ).toBe(book);
    });

    it("returns undefined when the book index is out of bounds", () => {
      expect(
        makeService().getBookByIndices({
          arrangementIndex: 0,
          testamentIndex: 0,
          sectionIndex: 0,
          bookIndex: 99,
        })
      ).toBeUndefined();
    });
  });

  // ─── getTestamentInfoPathByName ───────────────────────────────────────────

  describe("getTestamentInfoPathByName", () => {
    it("returns found=true and the correct testamentIndex when the name exists", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [
            makeTestament("Old Testament"),
            makeTestament("New Testament"),
          ]),
        ]),
      });
      const result = service.getTestamentInfoPathByName("New Testament");
      expect(result.found).toBe(true);
      expect(result.testamentIndex).toBe(1);
    });

    it("returns found=false when the testament name does not exist", () => {
      const result = makeService().getTestamentInfoPathByName("NonExistent");
      expect(result.found).toBe(false);
      expect(result.testamentIndex).toBeUndefined();
    });
  });

  // ─── getSectionInfoPathByName ─────────────────────────────────────────────

  describe("getSectionInfoPathByName", () => {
    it("returns found=true with correct indices when the section exists", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [
            makeTestament("OT", [
              makeSection("Pentateuch"),
              makeSection("Historical"),
            ]),
          ]),
        ]),
      });
      const result = service.getSectionInfoPathByName("Historical");
      expect(result.found).toBe(true);
      expect(result.testamentIndex).toBe(0);
      expect(result.sectionIndex).toBe(1);
    });

    it("returns found=false when the section name does not exist", () => {
      const result = makeService().getSectionInfoPathByName("NonExistent");
      expect(result.found).toBe(false);
      expect(result.sectionIndex).toBeUndefined();
    });
  });

  // ─── getBookInfoPathById ──────────────────────────────────────────────────

  describe("getBookInfoPathById", () => {
    it("returns found=true with correct indices when the book exists", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [
            makeTestament("OT", [
              makeSection("Pentateuch", [
                makeCompleteBook("gen"),
                makeCompleteBook("exo"),
              ]),
            ]),
          ]),
        ]),
      });
      const result = service.getBookInfoPathById({ id: "exo" });
      expect(result.found).toBe(true);
      expect(result.testamentIndex).toBe(0);
      expect(result.sectionIndex).toBe(0);
      expect(result.bookIndex).toBe(1);
    });

    it("returns found=false when the bookId does not exist", () => {
      const result = makeService().getBookInfoPathById({ id: "nonexistent" });
      expect(result.found).toBe(false);
      expect(result.bookIndex).toBeUndefined();
    });
  });

  // ─── getBookSubsetByCompleteId ────────────────────────────────────────────

  describe("getBookSubsetByCompleteId", () => {
    const makeSubsetService = (subsets: any[]) =>
      makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [
            makeTestament("OT", [makeSection("Poetry", subsets)]),
          ]),
        ]),
      });

    it("returns the subset book when chapterNumber falls within its range", () => {
      const subset = makeSubsetBook({
        completeBookId: "psa",
        startIndex: 0,
        numberOfChapters: 75,
      });
      const service = makeSubsetService([subset]);
      // range: start=1, end=75
      expect(
        service.getBookSubsetByCompleteId({ id: "psa", chapterNumber: 1 })
      ).toBe(subset);
      expect(
        service.getBookSubsetByCompleteId({ id: "psa", chapterNumber: 75 })
      ).toBe(subset);
    });

    it("returns undefined when chapterNumber is outside the subset range", () => {
      const subset = makeSubsetBook({
        completeBookId: "psa",
        startIndex: 0,
        numberOfChapters: 75,
      });
      const service = makeSubsetService([subset]);
      expect(
        service.getBookSubsetByCompleteId({ id: "psa", chapterNumber: 76 })
      ).toBeUndefined();
    });

    it("handles startIndex correctly — range starts at startIndex+1", () => {
      const subset = makeSubsetBook({
        completeBookId: "psa",
        startIndex: 75,
        numberOfChapters: 75,
      });
      const service = makeSubsetService([subset]);
      // range: start=76, end=150
      expect(
        service.getBookSubsetByCompleteId({ id: "psa", chapterNumber: 76 })
      ).toBe(subset);
      expect(
        service.getBookSubsetByCompleteId({ id: "psa", chapterNumber: 75 })
      ).toBeUndefined();
    });

    it("defaults startIndex to 0 when omitted", () => {
      const subset = makeSubsetBook({
        completeBookId: "psa",
        startIndex: undefined,
        numberOfChapters: 50,
      });
      const service = makeSubsetService([subset]);
      // range: start=1, end=50
      expect(
        service.getBookSubsetByCompleteId({ id: "psa", chapterNumber: 1 })
      ).toBe(subset);
    });

    it("returns undefined when no subset matches the given completeBookId", () => {
      const service = makeSubsetService([
        makeSubsetBook({ completeBookId: "psa" }),
      ]);
      expect(
        service.getBookSubsetByCompleteId({ id: "job", chapterNumber: 1 })
      ).toBeUndefined();
    });

    it("skips complete books — only matches type='subset'", () => {
      const service = makeSubsetService([makeCompleteBook("psa")]);
      expect(
        service.getBookSubsetByCompleteId({ id: "psa", chapterNumber: 1 })
      ).toBeUndefined();
    });

    it("returns undefined when the arrangement index is invalid", () => {
      const service = makeService();
      expect(
        service.getBookSubsetByCompleteId({
          id: "psa",
          chapterNumber: 1,
          arrangementIndex: 99,
        })
      ).toBeUndefined();
    });
  });

  // ─── getBooksNamesBySectionName ───────────────────────────────────────────

  describe("getBooksNamesBySectionName", () => {
    it("returns an array of bookIds for books in the found section", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [
            makeTestament("OT", [
              makeSection("Pentateuch", [
                makeCompleteBook("gen"),
                makeCompleteBook("exo"),
              ]),
            ]),
          ]),
        ]),
      });
      expect(service.getBooksNamesBySectionName("Pentateuch")).toEqual([
        "gen",
        "exo",
      ]);
    });

    it("returns null when the section name is not found", () => {
      expect(
        makeService().getBooksNamesBySectionName("NonExistent")
      ).toBeNull();
    });

    it("returns an empty array when the section has no books", () => {
      const service = makeService({
        arrangementConfigProviderPort: makeConfigProvider([
          makeArrangement("Standard", [
            makeTestament("OT", [makeSection("Empty", [])]),
          ]),
        ]),
      });
      expect(service.getBooksNamesBySectionName("Empty")).toEqual([]);
    });
  });
});
