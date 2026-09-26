import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceHierarchyService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceHierarchyService";
import type {
  PieceHierarchyPieceDataRepositoryPort,
  PieceHierarchyStackDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  CompleteBookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";

const ARRANGEMENT_NAME = "arrangement";

const sectionInfo: SectionInfo = {
  name: "Law",
  color: "#000000",
  books: [],
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

const testamentInfo: TestamentInfo = {
  name: "Old Testament",
  sections: [sectionInfo],
};

const bookInfo: CompleteBookInfo = {
  type: "complete",
  bookId: "GEN",
  author: "author",
  chaptersVerseCount: [10],
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: 1,
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
};

const makeBibleData = (id: string): StackBibleData =>
  new StackBibleData({
    id,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });

const makeTestamentData = (id: string): StackTestamentData =>
  new StackTestamentData({
    id,
    pieceInfo: testamentInfo,
    parentDataIds: {},
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
  });

const makeSectionData = (id: string): StackSectionData =>
  new StackSectionData({
    id,
    pieceInfo: sectionInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 10,
    },
  });

const makeSectionBookData = (id: string): StackSectionBookData =>
  new StackSectionBookData({
    id,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 10,
    },
  });

const makeBookData = (id: string): StackBookData =>
  new StackBookData({
    id,
    pieceInfo: bookInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      levelIndex: 0,
      bookIndex: 0,
      bookLevelIndex: 0,
      levelsLenght: 1,
    },
  });

type RegisteredData =
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData;

describe("pattern.bible-stack.application.services.PieceHierarchyService", () => {
  let service: PieceHierarchyService;
  let pieceDataRepositoryPort: Mocked<PieceHierarchyPieceDataRepositoryPort>;
  let bibleDataRepositoryPort: Mocked<PieceHierarchyStackDataRepositoryPort>;
  let biblesById: Map<string, StackBibleData>;
  let dataByTypeAndId: Map<string, RegisteredData>;

  const registerBible = (data: StackBibleData): StackBibleData => {
    biblesById.set(data.id, data);
    return data;
  };

  const register = <T extends RegisteredData>(data: T): T => {
    dataByTypeAndId.set(`${data.type}:${data.id}`, data);
    return data;
  };

  beforeEach(() => {
    biblesById = new Map();
    dataByTypeAndId = new Map();

    pieceDataRepositoryPort = {
      getDataById: vi.fn(),
    } as unknown as Mocked<PieceHierarchyPieceDataRepositoryPort>;

    bibleDataRepositoryPort = {
      getBibleDataById: vi.fn(),
    };

    pieceDataRepositoryPort.getDataById.mockImplementation((({ type, id }) =>
      dataByTypeAndId.get(
        `${type}:${id}`
      )) as PieceHierarchyPieceDataRepositoryPort["getDataById"]);
    bibleDataRepositoryPort.getBibleDataById.mockImplementation((id) =>
      biblesById.get(id)
    );

    service = new PieceHierarchyService({
      pieceDataRepositoryPort,
      bibleDataRepositoryPort,
    });
  });

  describe("getParentDataChain", () => {
    it("builds and returns the chain from the provided results", () => {
      const bibleData = registerBible(makeBibleData("bible"));
      const testamentData = register(makeTestamentData("testament"));
      const sectionData = register(makeSectionData("section"));
      const sectionBookData = register(makeSectionBookData("section-book"));
      const bookData = register(makeBookData("book"));

      const chain = service.getParentDataChain({
        stackBibleId: "bible",
        stackTestamentId: "testament",
        stackSectionId: "section",
        stackSectionBookId: "section-book",
        stackBookId: "book",
      });

      expect(chain).toEqual({
        bibleData,
        testamentData,
        sectionData,
        sectionBookData,
        bookData,
      });
      expect(service.getParentDataChain({})).toEqual({
        bibleData: undefined,
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });
    });

    it("looks for the bible data with the provided stack bible id", () => {
      registerBible(makeBibleData("other-bible"));
      const bibleData = registerBible(makeBibleData("bible"));

      expect(
        service.getParentDataChain({ stackBibleId: "bible" }).bibleData
      ).toBe(bibleData);
      expect(
        service.getParentDataChain({ stackBibleId: "missing" }).bibleData
      ).toBeUndefined();
      expect(service.getParentDataChain({}).bibleData).toBeUndefined();
    });

    it("looks for the testament data with the provided stack testament id", () => {
      register(makeTestamentData("other-testament"));
      register(makeSectionData("testament"));
      const testamentData = register(makeTestamentData("testament"));

      expect(
        service.getParentDataChain({ stackTestamentId: "testament" })
          .testamentData
      ).toBe(testamentData);
      expect(
        service.getParentDataChain({ stackTestamentId: "missing" })
          .testamentData
      ).toBeUndefined();
      expect(service.getParentDataChain({}).testamentData).toBeUndefined();
    });

    it("looks for the section data with the provided stack section id", () => {
      register(makeSectionData("other-section"));
      register(makeSectionBookData("section"));
      const sectionData = register(makeSectionData("section"));

      expect(
        service.getParentDataChain({ stackSectionId: "section" }).sectionData
      ).toBe(sectionData);
      expect(
        service.getParentDataChain({ stackSectionId: "missing" }).sectionData
      ).toBeUndefined();
      expect(service.getParentDataChain({}).sectionData).toBeUndefined();
    });

    it("looks for the section book data with the provided stack section book id", () => {
      register(makeSectionBookData("other-section-book"));
      register(makeSectionData("section-book"));
      const sectionBookData = register(makeSectionBookData("section-book"));

      expect(
        service.getParentDataChain({ stackSectionBookId: "section-book" })
          .sectionBookData
      ).toBe(sectionBookData);
      expect(
        service.getParentDataChain({ stackSectionBookId: "missing" })
          .sectionBookData
      ).toBeUndefined();
      expect(service.getParentDataChain({}).sectionBookData).toBeUndefined();
    });

    it("looks for the book data with the provided stack book id", () => {
      register(makeBookData("other-book"));
      register(makeSectionBookData("book"));
      const bookData = register(makeBookData("book"));

      expect(service.getParentDataChain({ stackBookId: "book" }).bookData).toBe(
        bookData
      );
      expect(
        service.getParentDataChain({ stackBookId: "missing" }).bookData
      ).toBeUndefined();
      expect(service.getParentDataChain({}).bookData).toBeUndefined();
    });
  });
});
