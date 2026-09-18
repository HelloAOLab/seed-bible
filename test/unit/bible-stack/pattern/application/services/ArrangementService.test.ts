import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ArrangementService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ArrangementService";
import type {
  ArrangementConfigProviderPort,
  ArrangementEventPort,
  CustomArrangementStorePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Arangement";
import type {
  ArrangementInfo,
  TestamentInfo,
  SectionInfo,
  CompleteBookInfo,
  SubsetBookInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";

describe("bible-stack.application.services.ArrangementService", () => {
  let service: ArrangementService;
  let arrangementConfigProviderPort: Mocked<ArrangementConfigProviderPort>;
  let eventManager: Mocked<ArrangementEventPort>;
  let customArrangementStorePort: Mocked<CustomArrangementStorePort>;
  const makeBook = (
    sectionName: string,
    arrangementName: string,
    testamentIndex: number,
    sectionIndex: number,
    bookIndex: number
  ): CompleteBookInfo => ({
    type: "complete",
    bookId: `${sectionName}-book-${bookIndex + 1}`,
    author: `${sectionName}-book-${bookIndex + 1}-author`,
    numberOfChapters: 2,
    chaptersVerseCount: [10, 12],
    relativeDateRange: { min: 0, max: 100 },
    path: { arrangementName, testamentIndex, sectionIndex, bookIndex },
  });

  const makeSection = (
    testamentName: string,
    arrangementName: string,
    testamentIndex: number,
    sectionIndex: number
  ): SectionInfo => {
    const name = `${testamentName}-sec-${sectionIndex + 1}`;
    return {
      name,
      color: "#cccccc",
      path: { arrangementName, testamentIndex, sectionIndex },
      books: [0, 1].map((bookIndex) =>
        makeBook(name, arrangementName, testamentIndex, sectionIndex, bookIndex)
      ),
    };
  };

  const makeTestament = (
    arrangementName: string,
    testamentIndex: number
  ): TestamentInfo => {
    const name = `${arrangementName}-tes-${testamentIndex + 1}`;
    return {
      name,
      sections: [0, 1].map((sectionIndex) =>
        makeSection(name, arrangementName, testamentIndex, sectionIndex)
      ),
    };
  };

  const makeArrangement = (name: string): ArrangementInfo => ({
    name,
    testaments: [0, 1].map((testamentIndex) =>
      makeTestament(name, testamentIndex)
    ),
  });

  let statics: ArrangementInfo[];
  let custom: ArrangementInfo[];
  let allArrangements: ArrangementInfo[];
  const index = 3;

  beforeEach(() => {
    statics = [
      makeArrangement("static-arr-1"),
      makeArrangement("static-arr-2"),
    ];
    custom = [makeArrangement("custom-arr-1"), makeArrangement("custom-arr-2")];
    allArrangements = [...statics, ...custom];
    arrangementConfigProviderPort = {
      getStaticArrangements: vi.fn(() => statics),
    };
    eventManager = {
      emit: vi.fn(),
    };
    customArrangementStorePort = {
      tryAddArrangement: vi.fn(),
      tryRemoveArrangement: vi.fn(),
      getArrangements: vi.fn(() => custom),
    };
    service = new ArrangementService({
      arrangementConfigProviderPort,
      eventManager,
      arrangementIndex: index,
      customArrangementStorePort,
    });
  });

  it("provides all arrangements", () => {
    const arrangements = service.getAllArrangements();
    expect(arrangements).toEqual(allArrangements);
  });

  it("provides default index", () => {
    expect(service.getCurrentArrangementIndex()).toBe(index);
  });

  it("changes index, emits and returns true on success", () => {
    const newIndex = 2;
    const result = service.setCurrentArrangementIndex(newIndex);

    expect(result).toBe(true);
    expect(eventManager.emit).toHaveBeenCalledExactlyOnceWith(
      "OnArrangementIndexChanged",
      { newIndex }
    );
  });

  it("no-ops on invalid indices, and succeds on valid index after", () => {
    const indices: number[] = [-10, allArrangements.length + 2, index];
    for (const invalidIndex of indices) {
      const result = service.setCurrentArrangementIndex(invalidIndex);

      expect(result).toBe(false);
      expect(eventManager.emit).not.toHaveBeenCalled();
    }

    const successfulResult = service.setCurrentArrangementIndex(1);

    expect(successfulResult).toBe(true);
    expect(eventManager.emit).toHaveBeenCalledOnce();
  });

  it("changes index by valid arrangement name", () => {
    service.setArrangementIndexByName("static-arr-1");
    let currIndex = service.getCurrentArrangementIndex();
    expect(currIndex).toBe(0);

    service.setArrangementIndexByName("custom-arr-1");
    currIndex = service.getCurrentArrangementIndex();
    expect(currIndex).toBe(2);
  });

  it("no-ops on invalid names", () => {
    service.setArrangementIndexByName("   static-arr-1   ");
    let currIndex = service.getCurrentArrangementIndex();
    expect(currIndex).toBe(index);

    service.setArrangementIndexByName("test-arr-1");
    currIndex = service.getCurrentArrangementIndex();
    expect(currIndex).toBe(index);

    service.setArrangementIndexByName("");
    currIndex = service.getCurrentArrangementIndex();
    expect(currIndex).toBe(index);
  });

  it("no-ops on current name", () => {
    service.setArrangementIndexByName("custom-arr-2");
    const currIndex = service.getCurrentArrangementIndex();
    expect(currIndex).toBe(index);
    expect(eventManager.emit).not.toHaveBeenCalled();
  });

  it("provides correct index by name", () => {
    const names = allArrangements.map((info) => info.name);
    for (let i = 0; i < names.length; i++) {
      const name = names[i]!;
      const arrIndex = service.getArrangementIndexByName(name);
      expect(arrIndex).toBe(i);
    }
  });

  it("provides -1 for names that don't match", () => {
    const names = ["   static-arr-1   ", "test-arr-2", ""];
    for (const name of names) {
      const arrIndex = service.getArrangementIndexByName(name);
      expect(arrIndex).toBe(-1);
    }
  });

  it("provides the current arrangement", () => {
    const currArr = allArrangements[index]!;

    const result = service.getCurrentArrangement();
    expect(result).toEqual(currArr);
  });

  it("provides the current arrangement name", () => {
    const currArrName = allArrangements[index]!.name;

    const result = service.getCurrentArrangementName();
    expect(result).toEqual(currArrName);
  });

  it("preserves current arrangement name and emits on successful add of an arrangement", () => {
    const testArr: ArrangementInfo = {
      name: "test-arr",
      testaments: [],
    };
    customArrangementStorePort.tryAddArrangement.mockReturnValue(true);
    service.addCustomArrangement(testArr);
    const name = service.getCurrentArrangementName();
    expect(name).toBe("custom-arr-2");
    expect(eventManager.emit).toHaveBeenCalledExactlyOnceWith(
      "OnCustomArrangementsChanged"
    );
  });

  it("no-ops on failed arrangement add attempt", () => {
    const testArr: ArrangementInfo = {
      name: "test-arr",
      testaments: [],
    };
    customArrangementStorePort.tryAddArrangement.mockReturnValue(false);
    service.addCustomArrangement(testArr);
    const name = service.getCurrentArrangementName();
    expect(name).toBe("custom-arr-2");
    expect(eventManager.emit).not.toHaveBeenCalled();
  });

  it("preserves name and emits on successful arrangement removal", () => {
    const testArr: ArrangementInfo = {
      name: "test-arr",
      testaments: [],
    };
    customArrangementStorePort.tryRemoveArrangement.mockReturnValue(true);
    service.removeCustomArrangement(testArr);
    const name = service.getCurrentArrangementName();
    expect(eventManager.emit).toHaveBeenCalledExactlyOnceWith(
      "OnCustomArrangementsChanged"
    );
    expect(name).toBe("custom-arr-2");
  });

  it("no-ops on failed arrangement remove attempt", () => {
    const testArr: ArrangementInfo = {
      name: "test-arr",
      testaments: [],
    };
    customArrangementStorePort.tryRemoveArrangement.mockReturnValue(false);
    service.removeCustomArrangement(testArr);
    expect(eventManager.emit).not.toHaveBeenCalled();
  });

  it("defaults index to 0 if the removed arrangement was the current one", () => {
    customArrangementStorePort.tryRemoveArrangement.mockReturnValue(true);
    service.removeCustomArrangement(allArrangements[index]!);
    const currIndex = service.getCurrentArrangementIndex();
    expect(currIndex).toBe(0);
  });

  it("provides arrangement by index", () => {
    for (let i = 0; i < allArrangements.length; i++) {
      const arr = service.getArrangementByIndex(i);
      expect(arr).toEqual(allArrangements[i]);
    }
    const arr = service.getArrangementByIndex(10);
    expect(arr).toBeUndefined();
  });

  it("provides testament by indices", () => {
    for (let i = 0; i < allArrangements.length; i++) {
      const arr = allArrangements[i]!;
      for (let j = 0; j < arr.testaments.length; j++) {
        const result = service.getTestamentByIndices({
          arrangementIndex: i,
          testamentIndex: j,
        });
        expect(result, `arrangement ${i}, testament ${j}`).toEqual(
          arr.testaments[j]
        );
      }
    }
    const result = service.getTestamentByIndices({
      arrangementIndex: 2,
      testamentIndex: 10,
    });
    expect(result).toBeUndefined();
  });

  it("provides section by indices", () => {
    for (let i = 0; i < allArrangements.length; i++) {
      const arr = allArrangements[i]!;
      for (let j = 0; j < arr.testaments.length; j++) {
        const tes = arr.testaments[j]!;
        for (let k = 0; k < tes.sections.length; k++) {
          const result = service.getSectionByIndices({
            arrangementIndex: i,
            testamentIndex: j,
            sectionIndex: k,
          });
          expect(
            result,
            `arrangement ${i}, testament ${j}, section ${k}`
          ).toEqual(tes.sections[k]);
        }
      }
    }

    const result = service.getSectionByIndices({
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 10,
    });
    expect(result).toBeUndefined();
  });

  it("provides book by indices", () => {
    for (let i = 0; i < allArrangements.length; i++) {
      const arr = allArrangements[i]!;
      for (let j = 0; j < arr.testaments.length; j++) {
        const tes = arr.testaments[j]!;
        for (let k = 0; k < tes.sections.length; k++) {
          const sec = tes.sections[k]!;
          for (let l = 0; l < sec.books.length; l++) {
            const result = service.getBookByIndices({
              arrangementIndex: i,
              testamentIndex: j,
              sectionIndex: k,
              bookIndex: l,
            });
            expect(
              result,
              `arrangement ${i}, testament ${j}, section ${k}, book ${l}`
            ).toEqual(sec.books[l]);
          }
        }
      }
    }
    const result = service.getBookByIndices({
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      bookIndex: 10,
    });
    expect(result).toBeUndefined();
  });

  it("provides testament info path by name", () => {
    const { found, arrangementIndex, testamentIndex } =
      service.getTestamentInfoPathByName("custom-arr-1-tes-2");

    expect(found).toBe(true);
    expect(arrangementIndex).toBe(2);
    expect(testamentIndex).toBe(1);
  });

  it("returns not found for an unknown testament name", () => {
    const { found, arrangementIndex, testamentIndex } =
      service.getTestamentInfoPathByName("wrong-testament-name");

    expect(found).toBe(false);
    expect(arrangementIndex).toBe(service.getCurrentArrangementIndex());
    expect(testamentIndex).toBeUndefined();
  });

  it("provides section info path by name", () => {
    const { found, arrangementIndex, testamentIndex, sectionIndex } =
      service.getSectionInfoPathByName("custom-arr-1-tes-2-sec-2");

    expect(found).toBe(true);
    expect(arrangementIndex).toBe(2);
    expect(testamentIndex).toBe(1);
    expect(sectionIndex).toBe(1);
  });

  it("returns not found for an unknown section name", () => {
    const { found, arrangementIndex, testamentIndex, sectionIndex } =
      service.getSectionInfoPathByName("wrong-section-name");

    expect(found).toBe(false);
    expect(arrangementIndex).toBe(service.getCurrentArrangementIndex());
    expect(testamentIndex).toBeUndefined();
    expect(sectionIndex).toBeUndefined();
  });

  it("provides book info path by id", () => {
    const { found, arrangementIndex, testamentIndex, sectionIndex, bookIndex } =
      service.getBookInfoPathById({ id: "custom-arr-1-tes-2-sec-2-book-2" });

    expect(found).toBe(true);
    expect(arrangementIndex).toBe(2);
    expect(testamentIndex).toBe(1);
    expect(sectionIndex).toBe(1);
    expect(bookIndex).toBe(1);
  });

  it("returns not found for an unknown book id", () => {
    const { found, arrangementIndex, testamentIndex, sectionIndex, bookIndex } =
      service.getBookInfoPathById({ id: "wrong-book-id" });

    expect(found).toBe(false);
    expect(arrangementIndex).toBe(service.getCurrentArrangementIndex());
    expect(testamentIndex).toBeUndefined();
    expect(sectionIndex).toBeUndefined();
    expect(bookIndex).toBeUndefined();
  });

  it("provides book names for an existing section name", () => {
    const section = allArrangements[2]!.testaments[1]!.sections[1]!;
    const expectedIds = section.books.map((book) => book.bookId);

    const result = service.getBooksNamesBySectionName(section.name);

    expect(result).toEqual(expectedIds);
  });

  it("returns null book names for an unknown section name", () => {
    const result = service.getBooksNamesBySectionName("wrong-section-name");

    expect(result).toBeNull();
  });

  describe("prefers the current arrangement when a name exists in several", () => {
    let collisionService: ArrangementService;

    const withSharedNames = (name: string): ArrangementInfo => ({
      name,
      testaments: [
        {
          name: "shared-tes",
          sections: [
            {
              name: "shared-sec",
              color: "#cccccc",
              path: {
                arrangementName: name,
                testamentIndex: 0,
                sectionIndex: 0,
              },
              books: [makeBook("shared-sec", name, 0, 0, 0)],
            },
          ],
        },
      ],
    });

    const currentIndex = 1;

    beforeEach(() => {
      arrangementConfigProviderPort = {
        getStaticArrangements: vi.fn(() => [
          withSharedNames("arr-a"),
          withSharedNames("arr-b"),
        ]),
      };
      customArrangementStorePort = {
        tryAddArrangement: vi.fn(),
        tryRemoveArrangement: vi.fn(),
        getArrangements: vi.fn(() => []),
      };
      collisionService = new ArrangementService({
        arrangementConfigProviderPort,
        eventManager,
        arrangementIndex: currentIndex,
        customArrangementStorePort,
      });
    });

    it("resolves a testament name to the current arrangement", () => {
      const { found, arrangementIndex } =
        collisionService.getTestamentInfoPathByName("shared-tes");
      expect(found).toBe(true);
      expect(arrangementIndex).toBe(currentIndex);
    });

    it("resolves a section name to the current arrangement", () => {
      const { found, arrangementIndex } =
        collisionService.getSectionInfoPathByName("shared-sec");
      expect(found).toBe(true);
      expect(arrangementIndex).toBe(currentIndex);
    });

    it("resolves a book id to the current arrangement", () => {
      const { found, arrangementIndex } = collisionService.getBookInfoPathById({
        id: "shared-sec-book-1",
      });
      expect(found).toBe(true);
      expect(arrangementIndex).toBe(currentIndex);
    });

    it("honors an explicit arrangement index over the current one", () => {
      const { found, arrangementIndex } =
        collisionService.getTestamentInfoPathByName("shared-tes", 0);
      expect(found).toBe(true);
      expect(arrangementIndex).toBe(0);
    });
  });

  describe("getBookSubsetByCompleteId", () => {
    let subsetService: ArrangementService;

    const makeSubset = (
      bookId: string,
      completeBookId: string,
      startIndex: number,
      numberOfChapters: number
    ): SubsetBookInfo => ({
      type: "subset",
      bookId,
      completeBookId,
      startIndex,
      endIndex: startIndex + numberOfChapters - 1,
      author: `${bookId}-author`,
      numberOfChapters,
      chaptersVerseCount: Array.from({ length: numberOfChapters }, () => 10),
      relativeDateRange: { min: 0, max: 100 },
      path: {
        arrangementName: "subset-arr",
        testamentIndex: 0,
        sectionIndex: 0,
        bookIndex: 0,
      },
    });

    const genesisPart1 = makeSubset("genesis-part-1", "complete-genesis", 0, 3);
    const genesisPart2 = makeSubset("genesis-part-2", "complete-genesis", 3, 2);
    const exodusPart1 = makeSubset("exodus-part-1", "complete-exodus", 0, 2);

    const subsetArrangement: ArrangementInfo = {
      name: "subset-arr",
      testaments: [
        {
          name: "subset-arr-tes-1",
          sections: [
            {
              name: "subset-arr-tes-1-sec-1",
              color: "#cccccc",
              path: {
                arrangementName: "subset-arr",
                testamentIndex: 0,
                sectionIndex: 0,
              },
              books: [genesisPart1, genesisPart2, exodusPart1],
            },
          ],
        },
      ],
    };

    beforeEach(() => {
      arrangementConfigProviderPort = {
        getStaticArrangements: vi.fn(() => [
          makeArrangement("plain-arr"),
          subsetArrangement,
        ]),
      };
      customArrangementStorePort = {
        tryAddArrangement: vi.fn(),
        tryRemoveArrangement: vi.fn(),
        getArrangements: vi.fn(() => []),
      };
      subsetService = new ArrangementService({
        arrangementConfigProviderPort,
        eventManager,
        arrangementIndex: 0,
        customArrangementStorePort,
      });
    });

    it("returns the subset whose chapter range contains the requested chapter", () => {
      const result = subsetService.getBookSubsetByCompleteId({
        id: "complete-genesis",
        chapterNumber: 2,
        arrangementIndex: 1,
      });
      expect(result).toEqual(genesisPart1);
    });

    it("disambiguates between subsets sharing a complete book id by chapter", () => {
      const result = subsetService.getBookSubsetByCompleteId({
        id: "complete-genesis",
        chapterNumber: 4,
        arrangementIndex: 1,
      });
      expect(result).toEqual(genesisPart2);
    });

    it("treats the subset's chapter range as inclusive at both ends", () => {
      const first = subsetService.getBookSubsetByCompleteId({
        id: "complete-genesis",
        chapterNumber: 1,
        arrangementIndex: 1,
      });
      const last = subsetService.getBookSubsetByCompleteId({
        id: "complete-genesis",
        chapterNumber: 3,
        arrangementIndex: 1,
      });
      expect(first).toEqual(genesisPart1);
      expect(last).toEqual(genesisPart1);
    });

    it("returns undefined when the chapter is outside every matching subset's range", () => {
      const result = subsetService.getBookSubsetByCompleteId({
        id: "complete-genesis",
        chapterNumber: 6,
        arrangementIndex: 1,
      });
      expect(result).toBeUndefined();
    });

    it("returns undefined for an unknown complete book id", () => {
      const result = subsetService.getBookSubsetByCompleteId({
        id: "complete-unknown",
        chapterNumber: 1,
        arrangementIndex: 1,
      });
      expect(result).toBeUndefined();
    });

    it("searches the current arrangement when no index is given", () => {
      const result = subsetService.getBookSubsetByCompleteId({
        id: "complete-genesis",
        chapterNumber: 2,
      });
      expect(result).toBeUndefined();
    });

    it("returns undefined when the arrangement index doesn't exist", () => {
      const result = subsetService.getBookSubsetByCompleteId({
        id: "complete-genesis",
        chapterNumber: 2,
        arrangementIndex: 10,
      });
      expect(result).toBeUndefined();
    });
  });
});
