import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ViewportService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ViewportService";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/ViewportService";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";

const bookInfo: BookInfo = {
  type: "complete",
  bookId: "book-info-id",
  author: "book-author",
  chaptersVerseCount: [10, 20],
  relativeDateRange: { min: 1000, max: 2000 },
  numberOfChapters: 2,
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

const sectionCreationParams = {
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  amountOfChaptersInSection: 2,
};

interface VisibilityParams {
  id: string;
  hasPiece?: boolean;
  isActive?: boolean;
  isHidden?: boolean;
}

const applyHidden = <T extends { hide(): void }>(
  data: T,
  isHidden: boolean
): T => {
  if (isHidden) data.hide();
  return data;
};

const makeChapterData = ({
  id,
  hasPiece = true,
  isActive = true,
  isHidden = false,
}: VisibilityParams): StackChapterData => {
  const chapterData = new StackChapterData({
    id,
    piece: hasPiece ? { id: `${id}-piece`, type: "StackChapter" } : undefined,
    pieceInfo: { amountOfVerses: 10, number: 1 },
    parentDataIds: {},
    isInsideBible: false,
    isHidden,
    creationParams: { bookId: "book-info-id" },
  });
  if (isActive) chapterData.activate();
  return chapterData;
};

const makeBookData = ({
  id,
  hasPiece = true,
  isActive = true,
  isHidden = false,
  chapters = [],
}: VisibilityParams & { chapters?: StackChapterData[] }): StackBookData =>
  applyHidden(
    new StackBookData({
      id,
      piece: hasPiece ? { id: `${id}-piece`, type: "StackBook" } : undefined,
      pieceInfo: bookInfo,
      parentDataIds: {},
      childrenData: chapters,
      isActive,
      creationParams: {
        arrangementIndex: 0,
        testamentIndex: 0,
        sectionIndex: 0,
        levelIndex: 0,
        bookIndex: 0,
        bookLevelIndex: 0,
        levelsLenght: 1,
      },
    }),
    isHidden
  );

const makeSectionData = ({
  id,
  hasPiece = true,
  isActive = true,
  isHidden = false,
  books = [],
}: VisibilityParams & { books?: StackBookData[] }): StackSectionData =>
  applyHidden(
    new StackSectionData({
      id,
      piece: hasPiece ? { id: `${id}-piece`, type: "StackSection" } : undefined,
      pieceInfo: sectionInfo,
      parentDataIds: {},
      childrenData: [books],
      isActive,
      creationParams: sectionCreationParams,
    }),
    isHidden
  );

const makeSectionBookData = ({
  id,
  hasPiece = true,
  isActive = true,
  isHidden = false,
  chapters = [],
}: VisibilityParams & {
  chapters?: StackChapterData[];
}): StackSectionBookData =>
  applyHidden(
    new StackSectionBookData({
      id,
      piece: hasPiece
        ? { id: `${id}-piece`, type: "StackSectionBook" }
        : undefined,
      pieceInfo: sectionInfo,
      pieceBookInfo: bookInfo,
      parentDataIds: {},
      childrenData: chapters,
      isActive,
      creationParams: sectionCreationParams,
    }),
    isHidden
  );

const makeTestamentData = ({
  id,
  hasPiece = true,
  isActive = true,
  isHidden = false,
  children = [],
}: VisibilityParams & {
  children?: (StackSectionData | StackSectionBookData)[];
}): StackTestamentData =>
  applyHidden(
    new StackTestamentData({
      id,
      piece: hasPiece
        ? { id: `${id}-piece`, type: "StackTestament" }
        : undefined,
      pieceInfo: { name: id, color: "#ffffff", sections: [sectionInfo] },
      parentDataIds: {},
      childrenData: children,
      isActive,
      creationParams: { arrangementIndex: 0, testamentIndex: 0 },
    }),
    isHidden
  );

const makeBibleData = (
  id: string,
  testaments: StackTestamentData[]
): StackBibleData =>
  new StackBibleData({
    id,
    childrenData: testaments,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });

const pieceIds = (pieces: Piece[]) => pieces.map((piece) => piece.id);

describe("pattern.bible-stack.application.services.ViewportService", () => {
  let service: ViewportService;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;

  beforeEach(() => {
    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(() => []),
    };

    pieceDataRepositoryPort = {
      getStandaloneTestaments: vi.fn(() => []),
      getStandaloneSections: vi.fn(() => []),
      getStandaloneSectionBooks: vi.fn(() => []),
      getStandaloneBooks: vi.fn(() => []),
    };

    service = new ViewportService({
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
    });
  });

  describe("getVisiblePieces", () => {
    it("returns an array of every visible piece from the hierarchy of every testament child of every bible found, and every standalone testament, section, section book and book found", () => {
      expect(service.getVisiblePieces()).toEqual([]);

      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([
        makeBibleData("bible-1", [
          makeTestamentData({
            id: "bible-1-testament-1",
            children: [
              makeSectionData({
                id: "bible-1-section-1",
                books: [
                  makeBookData({ id: "bible-1-book-1" }),
                  makeBookData({ id: "bible-1-book-2", isActive: false }),
                ],
              }),
              makeSectionBookData({
                id: "bible-1-section-book-1",
                isHidden: true,
              }),
            ],
          }),
          makeTestamentData({
            id: "bible-1-testament-2",
            isHidden: true,
            children: [makeSectionData({ id: "bible-1-section-2" })],
          }),
        ]),
        makeBibleData("bible-2", [
          makeTestamentData({
            id: "bible-2-testament-1",
            hasPiece: false,
            children: [
              makeSectionBookData({ id: "bible-2-section-book-1" }),
              makeSectionData({ id: "bible-2-section-1", isActive: false }),
            ],
          }),
        ]),
        makeBibleData("bible-3", []),
      ]);
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        makeTestamentData({ id: "standalone-testament-1" }),
        makeTestamentData({ id: "standalone-testament-2", isActive: false }),
      ]);
      pieceDataRepositoryPort.getStandaloneSections.mockReturnValue([
        makeSectionData({
          id: "standalone-section-1",
          books: [makeBookData({ id: "standalone-section-1-book-1" })],
        }),
      ]);
      pieceDataRepositoryPort.getStandaloneSectionBooks.mockReturnValue([
        makeSectionBookData({
          id: "standalone-section-book-1",
          chapters: [
            makeChapterData({ id: "standalone-section-book-1-chapter-1" }),
          ],
        }),
      ]);
      pieceDataRepositoryPort.getStandaloneBooks.mockReturnValue([
        makeBookData({
          id: "standalone-book-1",
          chapters: [
            makeChapterData({ id: "standalone-book-1-chapter-1" }),
            makeChapterData({
              id: "standalone-book-1-chapter-2",
              isHidden: true,
            }),
            makeChapterData({
              id: "standalone-book-1-chapter-3",
              hasPiece: false,
            }),
          ],
        }),
        makeBookData({ id: "standalone-book-2", hasPiece: false }),
      ]);

      const visiblePieces = service.getVisiblePieces();

      expect(pieceIds(visiblePieces)).toEqual([
        "bible-1-testament-1-piece",
        "bible-1-section-1-piece",
        "bible-1-book-1-piece",
        "bible-1-section-2-piece",
        "bible-2-section-book-1-piece",
        "standalone-testament-1-piece",
        "standalone-section-1-piece",
        "standalone-section-1-book-1-piece",
        "standalone-section-book-1-piece",
        "standalone-section-book-1-chapter-1-piece",
        "standalone-book-1-piece",
        "standalone-book-1-chapter-1-piece",
      ]);
      expect(visiblePieces).toContainEqual({
        id: "bible-1-testament-1-piece",
        type: "StackTestament",
      });
    });
  });
});
