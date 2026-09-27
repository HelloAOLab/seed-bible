import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { StackManagementService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackManagementService";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/stackManagement";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  BookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { PieceLifecycleServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLifecycle";
import type { BibleLifecycleServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleLifecycle";
import {
  makeBibleLifecycleServiceDouble,
  makePieceLifecycleServiceDouble,
} from "../serviceDoubles";

const BIBLE_ID = "bible-id";

const bookInfo: BookInfo = {
  type: "complete",
  bookId: "GEN",
  author: "book-author",
  chaptersVerseCount: [10, 20, 30],
  relativeDateRange: { min: 1000, max: 2000 },
  numberOfChapters: 3,
  path: {
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
};

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: [bookInfo],
  path: {
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

const testamentInfo: TestamentInfo = {
  name: "testament",
  sections: [sectionInfo],
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
    piece: { id: `${id}-piece`, type: "StackTestament" },
    pieceInfo: testamentInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
  });

const makeSectionData = (id: string): StackSectionData =>
  new StackSectionData({
    id,
    piece: { id: `${id}-piece`, type: "StackSection" },
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

const makeSectionBookData = (id: string): StackSectionBookData =>
  new StackSectionBookData({
    id,
    piece: { id: `${id}-piece`, type: "StackSectionBook" },
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

const makeBookData = (id: string): StackBookData =>
  new StackBookData({
    id,
    piece: { id: `${id}-piece`, type: "StackBook" },
    pieceInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
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

const makeChapterData = (id: string, number: number): StackChapterData =>
  new StackChapterData({
    id,
    piece: { id: `${id}-piece`, type: "StackChapter" },
    pieceInfo: { amountOfVerses: 10, number },
    parentDataIds: { stackBibleId: BIBLE_ID },
    isInsideBible: true,
    creationParams: { bookId: "GEN" },
  });

describe("pattern.bible-stack.application.services.StackManagementService", () => {
  let service: StackManagementService;
  let bibleLifecycleServicePort: Mocked<BibleLifecycleServicePort>;
  let pieceLifecycleServicePort: Mocked<PieceLifecycleServicePort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;

  beforeEach(() => {
    bibleLifecycleServicePort = makeBibleLifecycleServiceDouble();

    pieceLifecycleServicePort = makePieceLifecycleServiceDouble();

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(() => []),
    };

    pieceDataRepositoryPort = {
      getAllTestaments: vi.fn(() => []),
      getAllSections: vi.fn(() => []),
      getAllBooks: vi.fn(() => []),
      getAllChapters: vi.fn(() => []),
      getAllSectionBooks: vi.fn(() => []),
    };

    service = new StackManagementService({
      bibleLifecycleServicePort,
      pieceLifecycleServicePort,
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
    });
  });

  describe("clearAllStacks", () => {
    it("deletes all found bibles", () => {
      const bibles = [makeBibleData("bible-1"), makeBibleData("bible-2")];
      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue(bibles);

      service.clearAllStacks();

      expect(bibleLifecycleServicePort.deleteBibles).toHaveBeenCalledTimes(1);
      expect(bibleLifecycleServicePort.deleteBibles).toHaveBeenCalledWith(
        bibles
      );
    });

    it("deletes all found testaments", () => {
      const testaments = [
        makeTestamentData("testament-1"),
        makeTestamentData("testament-2"),
      ];
      pieceDataRepositoryPort.getAllTestaments.mockReturnValue(testaments);

      service.clearAllStacks();

      expect(pieceLifecycleServicePort.deleteTestaments).toHaveBeenCalledTimes(
        1
      );
      expect(pieceLifecycleServicePort.deleteTestaments).toHaveBeenCalledWith(
        testaments
      );
    });

    it("deletes all found sections", () => {
      const sections = [
        makeSectionData("section-1"),
        makeSectionData("section-2"),
      ];
      pieceDataRepositoryPort.getAllSections.mockReturnValue(sections);

      service.clearAllStacks();

      expect(pieceLifecycleServicePort.deleteSections).toHaveBeenCalledTimes(1);
      expect(pieceLifecycleServicePort.deleteSections).toHaveBeenCalledWith(
        sections
      );
    });

    it("deletes all found section books", () => {
      const sectionBooks = [
        makeSectionBookData("section-book-1"),
        makeSectionBookData("section-book-2"),
      ];
      pieceDataRepositoryPort.getAllSectionBooks.mockReturnValue(sectionBooks);

      service.clearAllStacks();

      expect(
        pieceLifecycleServicePort.deleteSectionBooks
      ).toHaveBeenCalledTimes(1);
      expect(pieceLifecycleServicePort.deleteSectionBooks).toHaveBeenCalledWith(
        sectionBooks
      );
    });

    it("deletes all found books", () => {
      const books = [makeBookData("book-1"), makeBookData("book-2")];
      pieceDataRepositoryPort.getAllBooks.mockReturnValue(books);

      service.clearAllStacks();

      expect(pieceLifecycleServicePort.deleteBooks).toHaveBeenCalledTimes(1);
      expect(pieceLifecycleServicePort.deleteBooks).toHaveBeenCalledWith(books);
    });

    it("deletes all found chapters", () => {
      const chapters = [
        makeChapterData("chapter-1", 1),
        makeChapterData("chapter-2", 2),
      ];
      pieceDataRepositoryPort.getAllChapters.mockReturnValue(chapters);

      service.clearAllStacks();

      expect(pieceLifecycleServicePort.deleteChapters).toHaveBeenCalledTimes(1);
      expect(pieceLifecycleServicePort.deleteChapters).toHaveBeenCalledWith(
        chapters
      );
    });
  });
});
