import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookChaptersManagementService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookChaptersManagementService";
import type { PieceLabelServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLabel";
import type { ScripturePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Scripture";
import type { ScripturePiecesStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ScripturePiecesState";
import type {
  BookChaptersManagementAdapterPort,
  ChapterSpawnerPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookChaptersManagement";
import type { BibleDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackUpdate";
import {
  StackBibleData,
  type StaticBiblePieces,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import type { InfoLabelData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/InfoLabelData";
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
import { SelectionEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import type { StackTransformer } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";

const BIBLE_ID = "bible-id";
const BOOK_ID = "book-id";
const BIGGER_CHAPTER = 150;

const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };
const sectionBookPiece: Piece<"StackSectionBook"> = {
  id: "section-book-piece",
  type: "StackSectionBook",
};
const bibleTransformer: StackTransformer = {
  id: "bible-transformer",
  type: "StackTransformer",
  bibleId: BIBLE_ID,
};

const makeChapterPiece = (id: string): Piece<"StackChapter"> => ({
  id,
  type: "StackChapter",
});

const bookInfo: BookInfo = {
  type: "complete",
  bookId: BOOK_ID,
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

const makeChapterData = ({
  number,
  piece,
  isActive = false,
  isInsideBible = true,
  isInsideBook = true,
  isHidden = false,
  isSelected = false,
}: {
  number: number;
  piece?: Piece<"StackChapter">;
  isActive?: boolean;
  isInsideBible?: boolean;
  isInsideBook?: boolean;
  isHidden?: boolean;
  isSelected?: boolean;
}): StackChapterData => {
  const chapterData = new StackChapterData({
    id: `chapter-data-${number}`,
    piece,
    pieceInfo: { amountOfVerses: number * 10, number },
    parentDataIds: { stackBibleId: BIBLE_ID, stackBookId: BOOK_ID },
    isInsideBible,
    isInsideBook,
    isHidden,
    creationParams: { bookId: BOOK_ID },
  });

  if (isActive) {
    chapterData.activate();
  }
  if (isSelected) {
    chapterData.changeSelectionState(SelectionEvents.RequestSelect);
    chapterData.changeSelectionState(SelectionEvents.SequenceComplete);
  }

  return chapterData;
};

const makeBookData = ({
  piece = bookPiece,
  childrenData = [],
  stackBibleId = BIBLE_ID,
}: {
  piece?: Piece<"StackBook"> | null;
  childrenData?: StackChapterData[];
  stackBibleId?: string | undefined;
} = {}): StackBookData =>
  new StackBookData({
    id: BOOK_ID,
    piece: piece ?? undefined,
    pieceInfo: bookInfo,
    parentDataIds: { stackBibleId },
    childrenData,
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

const makeSectionBookData = ({
  piece = sectionBookPiece,
  childrenData = [],
}: {
  piece?: Piece<"StackSectionBook">;
  childrenData?: StackChapterData[];
} = {}): StackSectionBookData =>
  new StackSectionBookData({
    id: "section-book-id",
    piece,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    childrenData,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

const makeBibleData = (transformer?: StackTransformer): StackBibleData =>
  new StackBibleData({
    id: BIBLE_ID,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    staticBiblePieces: transformer
      ? ({ bibleTransformer: transformer } as unknown as StaticBiblePieces)
      : undefined,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });

describe("pattern.bible-stack.application.services.BookChaptersManagementService", () => {
  let service: BookChaptersManagementService;
  let biggerChapterProviderPort: Mocked<ScripturePort>;
  let chapterSpawnerPort: Mocked<ChapterSpawnerPort>;
  let chaptersManagementAdapterPort: Mocked<BookChaptersManagementAdapterPort>;
  let scripturePiecesStateServicePort: Mocked<ScripturePiecesStateServicePort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort<"StackChapter">>;
  let arePiecesDraggable: boolean;

  beforeEach(() => {
    arePiecesDraggable = true;

    biggerChapterProviderPort = {
      mapSubsetToCompleteBook: vi.fn(),
      mapCompleteToSubsetBook: vi.fn(),
      getBiggerChapter: vi.fn(() => BIGGER_CHAPTER),
      getSectionChapterCount: vi.fn(),
      getBookChapterCount: vi.fn(),
    };

    chapterSpawnerPort = {
      spawnChapterDomain: vi.fn(),
      despawnChapter: vi.fn(),
    };

    chaptersManagementAdapterPort = {
      setUpChapter: vi.fn(),
      updateChaptersPosition: vi.fn(),
    };

    scripturePiecesStateServicePort = {
      get arePiecesDraggable() {
        return arePiecesDraggable;
      },
      shouldShowLabelDates:
        undefined as unknown as ScripturePiecesStateServicePort["shouldShowLabelDates"],
      resetToDefault: vi.fn(),
      makePiecesDraggable: vi.fn(),
      makePiecesNotDraggable: vi.fn(),
      enableLabelDates: vi.fn(),
      disableLabelDates: vi.fn(),
    };

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
      getBibleDataById: vi.fn(),
    };

    pieceLabelServicePort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
      updateLabelPosition: vi.fn(),
      getPieceLabel: vi.fn(),
    };

    service = new BookChaptersManagementService({
      biggerChapterProviderPort,
      chapterSpawnerPort,
      chaptersManagementAdapterPort,
      scripturePiecesStateServicePort,
      bibleDataRepositoryPort,
      pieceLabelServicePort,
    });
  });

  describe("showChapters", () => {
    it("throws if the provided book has no piece", () => {
      const bookData = makeBookData({
        piece: null,
        childrenData: [makeChapterData({ number: 1 })],
      });

      expect(() => service.showChapters(bookData)).toThrow(
        "BookChaptersManagementService: bookData.piece not defined at showChapters"
      );
      expect(chapterSpawnerPort.spawnChapterDomain).not.toHaveBeenCalled();
      expect(chaptersManagementAdapterPort.setUpChapter).not.toHaveBeenCalled();
    });

    it("successfully shows the books chapters", () => {
      const bookData = makeBookData({
        childrenData: [makeChapterData({ number: 1 })],
      });
      chapterSpawnerPort.spawnChapterDomain.mockReturnValue(
        makeChapterPiece("spawned-chapter-1")
      );

      expect(bookData.isShowingChapters).toBe(false);

      service.showChapters(bookData);

      expect(bookData.isShowingChapters).toBe(true);
    });

    it("correctly sets up every non-active chapter", () => {
      const cases = [
        {
          expectedBookPiece: bookPiece,
          isMovable: true,
          makeData: (childrenData: StackChapterData[]) =>
            makeBookData({ childrenData }),
        },
        {
          expectedBookPiece: sectionBookPiece,
          isMovable: false,
          makeData: (childrenData: StackChapterData[]) =>
            makeSectionBookData({ childrenData }),
        },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();
        arePiecesDraggable = testCase.isMovable;
        biggerChapterProviderPort.getBiggerChapter.mockReturnValue(
          BIGGER_CHAPTER
        );

        const activeChapterPiece = makeChapterPiece("active-chapter-piece");
        const firstSpawnedPiece = makeChapterPiece("spawned-chapter-1");
        const secondSpawnedPiece = makeChapterPiece("spawned-chapter-2");

        const firstChapterData = makeChapterData({
          number: 1,
          isInsideBible: false,
          isInsideBook: false,
          isHidden: true,
        });
        const activeChapterData = makeChapterData({
          number: 2,
          piece: activeChapterPiece,
          isActive: true,
        });
        const lastChapterData = makeChapterData({
          number: 3,
          isInsideBible: false,
          isInsideBook: false,
          isHidden: true,
        });

        chapterSpawnerPort.spawnChapterDomain
          .mockReturnValueOnce(firstSpawnedPiece)
          .mockReturnValueOnce(secondSpawnedPiece);

        const bookData = testCase.makeData([
          firstChapterData,
          activeChapterData,
          lastChapterData,
        ]);

        service.showChapters(bookData);

        for (const [chapterData, expectedPiece] of [
          [firstChapterData, firstSpawnedPiece],
          [lastChapterData, secondSpawnedPiece],
        ] as const) {
          expect(chapterData.piece).toBe(expectedPiece);
          expect(chapterData.isInsideBible).toBe(true);
          expect(chapterData.isInsideBook).toBe(true);
          expect(chapterData.isActive).toBe(true);
          expect(chapterData.isHidden).toBe(false);
          expect(chapterData.isHighlightable).toBe(true);
          expect(
            chaptersManagementAdapterPort.setUpChapter
          ).toHaveBeenCalledWith({
            chapter: expectedPiece,
            book: testCase.expectedBookPiece,
            bookInfo,
            chapterInfo: chapterData.pieceInfo,
            isMovable: testCase.isMovable,
            biggerChapter: BIGGER_CHAPTER,
          });
        }

        expect(chapterSpawnerPort.spawnChapterDomain).toHaveBeenCalledTimes(2);
        expect(
          chaptersManagementAdapterPort.setUpChapter
        ).toHaveBeenCalledTimes(2);
        expect(activeChapterData.piece).toBe(activeChapterPiece);
        expect(
          chaptersManagementAdapterPort.setUpChapter
        ).not.toHaveBeenCalledWith(
          expect.objectContaining({ chapter: activeChapterPiece })
        );
      }
    });
  });

  describe("hideChapters", () => {
    it("throws if the provided book has no piece", () => {
      const bookData = makeBookData({
        piece: null,
        childrenData: [
          makeChapterData({
            number: 1,
            piece: makeChapterPiece("chapter-piece-1"),
            isActive: true,
          }),
        ],
      });
      bookData.showChapters();

      expect(() => service.hideChapters(bookData)).toThrow(
        "BookChaptersManagementService: bookData.piece not defined at hideChapters"
      );
      expect(chapterSpawnerPort.despawnChapter).not.toHaveBeenCalled();
    });

    it("no-ops if the provided book is now showing chapters", () => {
      const chapterPiece = makeChapterPiece("chapter-piece-1");
      const chapterData = makeChapterData({
        number: 1,
        piece: chapterPiece,
        isActive: true,
      });
      const bookData = makeBookData({ childrenData: [chapterData] });

      service.hideChapters(bookData);

      expect(chapterSpawnerPort.despawnChapter).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.getPieceLabel).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(chapterData.piece).toBe(chapterPiece);
      expect(chapterData.isActive).toBe(true);
    });

    it("successfully hides the chapters", () => {
      const bookData = makeBookData({
        childrenData: [
          makeChapterData({
            number: 1,
            piece: makeChapterPiece("chapter-piece-1"),
            isActive: true,
          }),
        ],
      });
      bookData.showChapters();

      expect(bookData.isShowingChapters).toBe(true);

      service.hideChapters(bookData);

      expect(bookData.isShowingChapters).toBe(false);
    });

    it("successfully clears the book's previous highlighted chapter", () => {
      const bookData = makeBookData({
        childrenData: [
          makeChapterData({
            number: 1,
            piece: makeChapterPiece("chapter-piece-1"),
            isActive: true,
          }),
        ],
      });
      bookData.showChapters();

      service.hideChapters(bookData);

      expect(bookData.previousHighlightedChapterData).toBeUndefined();
    });

    it("successfully hides the label for all chapters that are active, inside book, have a piece and have a label", () => {
      const labelledPiece = makeChapterPiece("labelled-chapter-piece");
      const unlabelledPiece = makeChapterPiece("unlabelled-chapter-piece");
      const inactivePiece = makeChapterPiece("inactive-chapter-piece");
      const outsideBookPiece = makeChapterPiece("outside-book-chapter-piece");
      const label = { id: "chapter-label" } as unknown as InfoLabelData;

      pieceLabelServicePort.getPieceLabel.mockImplementation((piece) =>
        piece.id === unlabelledPiece.id ? undefined : label
      );

      const bookData = makeBookData({
        childrenData: [
          makeChapterData({ number: 1, piece: labelledPiece, isActive: true }),
          makeChapterData({
            number: 2,
            piece: unlabelledPiece,
            isActive: true,
          }),
          makeChapterData({ number: 3, isActive: true }),
          makeChapterData({ number: 4, piece: inactivePiece }),
          makeChapterData({
            number: 5,
            piece: outsideBookPiece,
            isActive: true,
            isInsideBook: false,
          }),
        ],
      });
      bookData.showChapters();

      service.hideChapters(bookData);

      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        labelledPiece
      );
    });

    it("successfully despawns the pieces for all active, inside-the-book chapters", () => {
      const firstPiece = makeChapterPiece("first-chapter-piece");
      const secondPiece = makeChapterPiece("second-chapter-piece");
      const inactivePiece = makeChapterPiece("inactive-chapter-piece");
      const outsideBookPiece = makeChapterPiece("outside-book-chapter-piece");

      const firstChapterData = makeChapterData({
        number: 1,
        piece: firstPiece,
        isActive: true,
      });
      const secondChapterData = makeChapterData({
        number: 2,
        piece: secondPiece,
        isActive: true,
      });
      const pieceLessChapterData = makeChapterData({
        number: 3,
        isActive: true,
      });
      const inactiveChapterData = makeChapterData({
        number: 4,
        piece: inactivePiece,
      });
      const outsideBookChapterData = makeChapterData({
        number: 5,
        piece: outsideBookPiece,
        isActive: true,
        isInsideBook: false,
      });

      const bookData = makeBookData({
        childrenData: [
          firstChapterData,
          secondChapterData,
          pieceLessChapterData,
          inactiveChapterData,
          outsideBookChapterData,
        ],
      });
      bookData.showChapters();

      service.hideChapters(bookData);

      expect(chapterSpawnerPort.despawnChapter).toHaveBeenCalledTimes(2);
      expect(chapterSpawnerPort.despawnChapter).toHaveBeenCalledWith(
        firstPiece
      );
      expect(chapterSpawnerPort.despawnChapter).toHaveBeenCalledWith(
        secondPiece
      );

      for (const chapterData of [firstChapterData, secondChapterData]) {
        expect(chapterData.piece).toBeUndefined();
        expect(chapterData.isActive).toBe(false);
        expect(chapterData.isInsideBook).toBeUndefined();
        expect(chapterData.isInsideBible).toBeUndefined();
      }

      expect(inactiveChapterData.piece).toBe(inactivePiece);
      expect(outsideBookChapterData.piece).toBe(outsideBookPiece);
      expect(outsideBookChapterData.isActive).toBe(true);
    });
  });

  describe("updateChaptersPosition", () => {
    it("throws if the provided book has no piece", () => {
      const bookData = makeBookData({
        piece: null,
        childrenData: [
          makeChapterData({
            number: 1,
            piece: makeChapterPiece("chapter-piece-1"),
            isActive: true,
          }),
        ],
      });

      expect(() => service.updateChaptersPosition(bookData)).toThrow(
        "BookChaptersManagementService: bookData.piece not defined at updateChaptersPosition"
      );
      expect(
        chaptersManagementAdapterPort.updateChaptersPosition
      ).not.toHaveBeenCalled();
    });

    it("no-ops if there's no chapter that needs position update", () => {
      const bookData = makeBookData({
        childrenData: [
          makeChapterData({
            number: 1,
            piece: makeChapterPiece("inactive-chapter-piece"),
          }),
          makeChapterData({
            number: 2,
            piece: makeChapterPiece("hidden-chapter-piece"),
            isActive: true,
            isHidden: true,
          }),
          makeChapterData({
            number: 3,
            piece: makeChapterPiece("outside-book-chapter-piece"),
            isActive: true,
            isInsideBook: false,
          }),
          makeChapterData({ number: 4, isActive: true }),
        ],
      });

      service.updateChaptersPosition(bookData);

      expect(
        chaptersManagementAdapterPort.updateChaptersPosition
      ).not.toHaveBeenCalled();
      expect(bibleDataRepositoryPort.getBibleDataById).not.toHaveBeenCalled();
    });

    it("updates chapters position with the correct arguments.", () => {
      const selectedPiece = makeChapterPiece("selected-chapter-piece");
      const unselectedPiece = makeChapterPiece("unselected-chapter-piece");

      bibleDataRepositoryPort.getBibleDataById.mockImplementation((id) =>
        id === BIBLE_ID ? makeBibleData(bibleTransformer) : undefined
      );

      const bookData = makeBookData({
        childrenData: [
          makeChapterData({
            number: 1,
            piece: selectedPiece,
            isActive: true,
            isSelected: true,
          }),
          makeChapterData({
            number: 2,
            piece: unselectedPiece,
            isActive: true,
          }),
          makeChapterData({
            number: 3,
            piece: makeChapterPiece("hidden-chapter-piece"),
            isActive: true,
            isHidden: true,
          }),
          makeChapterData({ number: 4, isActive: true }),
        ],
      });

      service.updateChaptersPosition(bookData);

      expect(
        chaptersManagementAdapterPort.updateChaptersPosition
      ).toHaveBeenCalledExactlyOnceWith({
        book: bookPiece,
        chapters: [
          { piece: selectedPiece, isSelected: true },
          { piece: unselectedPiece, isSelected: false },
        ],
        bibleTransformer,
      });
    });
  });
});
