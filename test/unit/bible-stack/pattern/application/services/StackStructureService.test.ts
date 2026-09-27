import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { StackStructureService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackStructureService";
import type { PieceLifecycleServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLifecycle";
import type { PieceAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/stackStructure";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import type {
  BookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type ParentDataIds,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { EventManagerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/EventManager";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";
import { makePieceLifecycleServiceDouble } from "../serviceDoubles";

const BIBLE_ID = "bible-id";
const TESTAMENT_ID = "testament-id";
const SECTION_ID = "section-id";
const SECTION_BOOK_ID = "section-book-id";
const BOOK_ID = "book-id";
const BOOK_INFO_ID = "book-info-id";

const bookInfo: BookInfo = {
  type: "complete",
  bookId: BOOK_INFO_ID,
  author: "book-author",
  chaptersVerseCount: [10, 20, 30],
  relativeDateRange: { min: 1000, max: 2000 },
  numberOfChapters: 3,
  path: {
    arrangementName: "arrangement",
    testamentIndex: 2,
    sectionIndex: 3,
    bookIndex: 5,
  },
};

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: [bookInfo],
  path: {
    arrangementName: "arrangement",
    testamentIndex: 2,
    sectionIndex: 3,
  },
};

const testamentInfo: TestamentInfo = {
  name: "testament",
  sections: [sectionInfo],
};

const makeBibleData = (childrenData: StackTestamentData[] = []) =>
  new StackBibleData({
    id: BIBLE_ID,
    childrenData,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 1,
    bibleType: BibleTypes.Default,
  });

const makeTestamentData = ({
  id = TESTAMENT_ID,
  piece,
  childrenData = [],
}: {
  id?: string;
  piece?: Piece<"StackTestament">;
  childrenData?: (StackSectionData | StackSectionBookData)[];
} = {}) =>
  new StackTestamentData({
    id,
    piece,
    childrenData,
    pieceInfo: testamentInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    creationParams: { arrangementIndex: 1, testamentIndex: 2 },
  });

const makeSectionData = ({
  id = SECTION_ID,
  childrenData = [],
}: {
  id?: string;
  childrenData?: StackBookData[][];
} = {}) =>
  new StackSectionData({
    id,
    childrenData,
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    creationParams: {
      arrangementIndex: 1,
      testamentIndex: 2,
      sectionIndex: 3,
      amountOfChaptersInSection: 30,
    },
  });

const makeSectionBookData = ({
  id = SECTION_BOOK_ID,
  childrenData = [],
}: {
  id?: string;
  childrenData?: StackChapterData[];
} = {}) =>
  new StackSectionBookData({
    id,
    childrenData,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    creationParams: {
      arrangementIndex: 1,
      testamentIndex: 2,
      sectionIndex: 4,
      amountOfChaptersInSection: 3,
    },
  });

const makeBookData = ({
  id = BOOK_ID,
  childrenData = [],
}: {
  id?: string;
  childrenData?: StackChapterData[];
} = {}) =>
  new StackBookData({
    id,
    childrenData,
    pieceInfo: bookInfo,
    parentDataIds: {
      stackBibleId: BIBLE_ID,
      stackTestamentId: TESTAMENT_ID,
      stackSectionId: SECTION_ID,
    },
    creationParams: {
      arrangementIndex: 1,
      testamentIndex: 2,
      sectionIndex: 3,
      levelIndex: 4,
      bookIndex: 5,
      bookLevelIndex: 6,
      levelsLenght: 7,
    },
  });

const makeChapterData = ({ id = "chapter-id" }: { id?: string } = {}) =>
  new StackChapterData({
    id,
    pieceInfo: { amountOfVerses: 20, number: 2 },
    parentDataIds: {
      stackBibleId: BIBLE_ID,
      stackTestamentId: TESTAMENT_ID,
      stackSectionId: SECTION_ID,
      stackBookId: BOOK_ID,
    },
    isInsideBible: true,
    creationParams: { bookId: BOOK_INFO_ID },
  });

const clearedParentDataIds: ParentDataIds = {
  stackBibleId: undefined,
  stackBookId: undefined,
  stackSectionBookId: undefined,
  stackSectionId: undefined,
  stackTestamentId: undefined,
};

describe("pattern.bible-stack.application.services.StackStructureService", () => {
  let service: StackStructureService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let pieceLifecycleServicePort: Mocked<PieceLifecycleServicePort>;
  let eventManagerPort: Mocked<EventManagerPort<BibleStackEvents>>;

  beforeEach(() => {
    pieceAdapterPort = {
      makePieceErasable: vi.fn(),
    };

    pieceLifecycleServicePort = makePieceLifecycleServiceDouble();

    eventManagerPort = {
      emit: vi.fn(),
    } as unknown as Mocked<EventManagerPort<BibleStackEvents>>;

    service = new StackStructureService({
      pieceAdapterPort,
      pieceLifecycleServicePort,
      eventManagerPort,
    });
  });

  describe("pullOutPieceFromParent", () => {
    it("makes the piece erasable if it exists", () => {
      const piece: Piece<"StackTestament"> = {
        id: "testament-piece",
        type: "StackTestament",
      };
      const testamentWithPiece = makeTestamentData({ piece });
      const testamentWithoutPiece = makeTestamentData({ id: "no-piece" });
      pieceLifecycleServicePort.createTestament.mockReturnValue(
        makeTestamentData({ id: "testament-copy" })
      );

      service.pullOutPieceFromParent({
        pieceData: testamentWithPiece,
        bibleData: makeBibleData([testamentWithPiece]),
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });
      service.pullOutPieceFromParent({
        pieceData: testamentWithoutPiece,
        bibleData: makeBibleData([testamentWithoutPiece]),
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });

      expect(pieceAdapterPort.makePieceErasable).toHaveBeenCalledTimes(1);
      expect(pieceAdapterPort.makePieceErasable).toHaveBeenCalledWith(piece);
    });

    it("replaces the piece in the parent with a copy", () => {
      const bookData = makeBookData();
      const siblingBookData = makeBookData({ id: "sibling-book" });
      const bookCopy = makeBookData({ id: "book-copy" });
      const sectionData = makeSectionData({
        childrenData: [[siblingBookData, bookData]],
      });
      pieceLifecycleServicePort.createBook.mockReturnValue(bookCopy);

      service.pullOutPieceFromParent({
        pieceData: bookData,
        bibleData: undefined,
        testamentData: undefined,
        sectionData,
        sectionBookData: undefined,
        bookData: undefined,
      });

      expect(
        sectionData.childrenData.map((books) => books.map(({ id }) => id))
      ).toEqual([["sibling-book", "book-copy"]]);
    });

    it("creates a testament copy with isHidden: true, and same arrangement index, testament index and bible data id", () => {
      const testamentData = makeTestamentData();
      const testamentCopy = makeTestamentData({ id: "testament-copy" });
      const bibleData = makeBibleData([testamentData]);
      pieceLifecycleServicePort.createTestament.mockReturnValue(testamentCopy);

      service.pullOutPieceFromParent({
        pieceData: testamentData,
        bibleData,
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });

      expect(pieceLifecycleServicePort.createTestament).toHaveBeenCalledWith({
        arrangementIndex: 1,
        testamentIndex: 2,
        bibleDataId: BIBLE_ID,
        isHidden: true,
      });
      expect(bibleData.childrenData.map(({ id }) => id)).toEqual([
        "testament-copy",
      ]);
    });

    it("creates a section and section book copy with isInsideBible: true, isInsideTestament: true, and same arrangement index, testament index, section index, bible data id and testament data id", () => {
      const sectionData = makeSectionData();
      const sectionBookData = makeSectionBookData();
      const sectionCopy = makeSectionData({ id: "section-copy" });
      const sectionBookCopy = makeSectionBookData({ id: "section-book-copy" });
      const bibleData = makeBibleData();
      const testamentData = makeTestamentData({
        childrenData: [sectionData, sectionBookData],
      });
      pieceLifecycleServicePort.createSection
        .mockReturnValueOnce(sectionCopy)
        .mockReturnValueOnce(sectionBookCopy);

      service.pullOutPieceFromParent({
        pieceData: sectionData,
        bibleData,
        testamentData,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });
      service.pullOutPieceFromParent({
        pieceData: sectionBookData,
        bibleData,
        testamentData,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });

      expect(pieceLifecycleServicePort.createSection).toHaveBeenNthCalledWith(
        1,
        {
          arrangementIndex: 1,
          testamentIndex: 2,
          sectionIndex: 3,
          isInsideBible: true,
          isInsideTestament: true,
          bibleDataId: BIBLE_ID,
          testamentDataId: TESTAMENT_ID,
        }
      );
      expect(pieceLifecycleServicePort.createSection).toHaveBeenNthCalledWith(
        2,
        {
          arrangementIndex: 1,
          testamentIndex: 2,
          sectionIndex: 4,
          isInsideBible: true,
          isInsideTestament: true,
          bibleDataId: BIBLE_ID,
          testamentDataId: TESTAMENT_ID,
        }
      );
      expect(testamentData.childrenData.map(({ id }) => id)).toEqual([
        "section-copy",
        "section-book-copy",
      ]);
    });

    it("creates a book copy with isInsideBible: true, isInsideTestament: true, isInsideSection: true, and same arrangement index, testament index, section index, level index, book index, book level index, levels length, bible data id, testament data id and section data id", () => {
      const bookData = makeBookData();
      const bookCopy = makeBookData({ id: "book-copy" });
      const sectionData = makeSectionData({ childrenData: [[bookData]] });
      pieceLifecycleServicePort.createBook.mockReturnValue(bookCopy);

      service.pullOutPieceFromParent({
        pieceData: bookData,
        bibleData: makeBibleData(),
        testamentData: makeTestamentData(),
        sectionData,
        sectionBookData: undefined,
        bookData: undefined,
      });

      expect(pieceLifecycleServicePort.createBook).toHaveBeenCalledWith({
        arrangementIndex: 1,
        testamentIndex: 2,
        sectionIndex: 3,
        levelIndex: 4,
        bookIndex: 5,
        bookLevelIndex: 6,
        levelsLenght: 7,
        isInsideBible: true,
        isInsideTestament: true,
        isInsideSection: true,
        bibleDataId: BIBLE_ID,
        testamentDataId: TESTAMENT_ID,
        sectionDataId: SECTION_ID,
      });
      expect(
        sectionData.childrenData.map((books) => books.map(({ id }) => id))
      ).toEqual([["book-copy"]]);
    });

    it("creates a chapter copy with isInsideBible: true, isInsideBook: true, isHidden: true, and same chapter info, bible data id, testament data id, section data id, section book data id, book data id and book id", () => {
      const chapterData = makeChapterData();
      const chapterCopy = makeChapterData({ id: "chapter-copy" });
      const sectionBookData = makeSectionBookData({
        childrenData: [chapterData],
      });
      const bookData = makeBookData({ childrenData: [chapterData] });
      pieceLifecycleServicePort.createChapter.mockReturnValue(chapterCopy);

      service.pullOutPieceFromParent({
        pieceData: chapterData,
        bibleData: makeBibleData(),
        testamentData: makeTestamentData(),
        sectionData: makeSectionData(),
        sectionBookData,
        bookData,
      });

      expect(pieceLifecycleServicePort.createChapter).toHaveBeenCalledWith({
        chapterInfo: { amountOfVerses: 20, number: 2 },
        isInsideBible: true,
        isInsideBook: true,
        bibleDataId: BIBLE_ID,
        testamentDataId: TESTAMENT_ID,
        sectionDataId: SECTION_ID,
        sectionBookDataId: SECTION_BOOK_ID,
        bookDataId: BOOK_ID,
        isHidden: true,
        bookId: BOOK_INFO_ID,
      });
      expect(sectionBookData.childrenData.map(({ id }) => id)).toEqual([
        "chapter-copy",
      ]);
      expect(bookData.childrenData.map(({ id }) => id)).toEqual(["chapter-id"]);
    });

    it("clears all piece's parent ids, after replacing the piece with a copy", () => {
      const chapterData = makeChapterData();
      const chapterCopy = makeChapterData({ id: "chapter-copy" });
      const bookData = makeBookData({ childrenData: [chapterData] });
      pieceLifecycleServicePort.createChapter.mockReturnValue(chapterCopy);

      service.pullOutPieceFromParent({
        pieceData: chapterData,
        bibleData: undefined,
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData,
      });

      expect(chapterData.parentDataIds).toEqual(clearedParentDataIds);
      expect(bookData.childrenData.map(({ id }) => id)).toEqual([
        "chapter-copy",
      ]);
    });

    it("emits at the end", () => {
      const testamentData = makeTestamentData();
      const testamentCopy = makeTestamentData({ id: "testament-copy" });
      const bibleData = makeBibleData([testamentData]);
      pieceLifecycleServicePort.createTestament.mockReturnValue(testamentCopy);
      let parentDataIdsOnEmit: ParentDataIds | undefined;
      let bibleChildrenIdsOnEmit: string[] = [];
      eventManagerPort.emit.mockImplementation(() => {
        parentDataIdsOnEmit = testamentData.parentDataIds;
        bibleChildrenIdsOnEmit = bibleData.childrenData.map(({ id }) => id);
      });

      service.pullOutPieceFromParent({
        pieceData: testamentData,
        bibleData,
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });

      expect(eventManagerPort.emit).toHaveBeenCalledTimes(1);
      expect(eventManagerPort.emit).toHaveBeenCalledWith(
        "OnStackPiecePulledOut"
      );
      expect(parentDataIdsOnEmit).toEqual(clearedParentDataIds);
      expect(bibleChildrenIdsOnEmit).toEqual(["testament-copy"]);
    });
  });
});
