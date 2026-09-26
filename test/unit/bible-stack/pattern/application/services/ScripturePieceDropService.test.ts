import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceDropService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceDropService";
import type { ChapterSelectionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterSelection";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";
import type {
  PieceAdapterPort,
  PieceDropEventPort,
  ScripturePieceDropDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrop";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type BibleState,
  type DropEvent,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { HighlightRequestSources } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import { SelectionEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";

const BIBLE_ID = "bible-id";
const BOOK_ID = "book-id";
const SECTION_BOOK_ID = "section-book-id";

const chapterPiece: Piece<"StackChapter"> = {
  id: "chapter-piece",
  type: "StackChapter",
};
const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };
const sectionBookPiece: Piece<"StackSectionBook"> = {
  id: "section-book-piece",
  type: "StackSectionBook",
};

const bookInfo: BookInfo = {
  type: "complete",
  bookId: "GEN",
  author: "author",
  chaptersVerseCount: [10],
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: 1,
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

const makeBibleData = (state?: BibleState): StackBibleData => {
  const bibleData = new StackBibleData({
    id: BIBLE_ID,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });
  if (state) {
    bibleData.changeState(state);
  }
  return bibleData;
};

const makeBookData = (): StackBookData =>
  new StackBookData({
    id: BOOK_ID,
    piece: bookPiece,
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

const makeSectionBookData = (): StackSectionBookData =>
  new StackSectionBookData({
    id: SECTION_BOOK_ID,
    piece: sectionBookPiece,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 1,
    },
  });

const makeChapterData = ({
  isSelected = false,
  isFocused = false,
  isOnTheGround = false,
}: {
  isSelected?: boolean;
  isFocused?: boolean;
  isOnTheGround?: boolean;
} = {}): StackChapterData => {
  const chapterData = new StackChapterData({
    id: "chapter-data",
    piece: chapterPiece,
    pieceInfo: { amountOfVerses: 10, number: 1 },
    parentDataIds: { stackBibleId: BIBLE_ID, stackBookId: BOOK_ID },
    isInsideBible: true,
    isSelected,
    creationParams: { bookId: "GEN" },
  });
  if (isSelected) {
    chapterData.changeSelectionState(SelectionEvents.SequenceComplete);
  }
  chapterData.beginDrag();
  if (isOnTheGround) {
    chapterData.placeOnGround();
  }
  if (isFocused) {
    chapterData.beginFocus();
  }
  return chapterData;
};

const makeParentDataChain = (
  overrides: Partial<ParentDataChain> = {}
): ParentDataChain => ({
  bibleData: makeBibleData(BibleStates.Open),
  testamentData: undefined,
  sectionData: undefined,
  sectionBookData: undefined,
  bookData: undefined,
  ...overrides,
});

const dropOverPieceEvent: DropEvent = {
  piece: chapterPiece,
  to: { piece: bookPiece, x: 1, y: 1 },
  from: { x: 0, y: 0 },
};

const createDeferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("pattern.bible-stack.application.services.ScripturePieceDropService", () => {
  let service: ScripturePieceDropService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let pieceDataRepositoryPort: Mocked<ScripturePieceDropDataRepositoryPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let chapterSelectionServicePort: Mocked<ChapterSelectionPort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let pieceDropEventPort: Mocked<PieceDropEventPort>;
  let loggerPort: Mocked<LoggerPort>;

  const arrangeChapter = (
    chapterData: StackChapterData,
    chain: ParentDataChain = makeParentDataChain()
  ) => {
    pieceDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
    pieceHierarchyServicePort.getParentDataChain.mockReturnValue(chain);
    return { chapterData, chain };
  };

  const expectNoOp = (chapterData: StackChapterData) => {
    expect(chapterData.isBeingDragged).toBe(true);
    expect(chapterData.isOnTheGround).toBe(false);
    expect(chapterData.isHighlightable).toBe(false);
    expect(pieceAdapterPort.releaseTransformer).not.toHaveBeenCalled();
    expect(chapterSelectionServicePort.deselectChapter).not.toHaveBeenCalled();
    expect(pieceHighlightServicePort.tryHighlightPiece).not.toHaveBeenCalled();
    expect(pieceDropEventPort.emit).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    pieceAdapterPort = {
      isPieceAnchored: vi.fn().mockReturnValue(false),
      hasTransformer: vi.fn().mockReturnValue(false),
      releaseTransformer: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<ScripturePieceDropDataRepositoryPort>;

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn().mockReturnValue(false),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    chapterSelectionServicePort = {
      deselectChapter: vi.fn().mockResolvedValue(undefined),
      trySelectChapter: vi.fn().mockResolvedValue(undefined),
    };

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn().mockResolvedValue(undefined),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    pieceDropEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<PieceDropEventPort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new ScripturePieceDropService({
      pieceAdapterPort,
      pieceDataRepositoryPort,
      sequenceStateServicePort,
      pieceHierarchyServicePort,
      chapterSelectionServicePort,
      pieceHighlightServicePort,
      pieceDropEventPort,
      loggerPort,
    });
  });

  describe("handlePieceDrop", () => {
    it("no-ops if there's an ongoing sequence", () => {
      const { chapterData } = arrangeChapter(makeChapterData());
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      service.handlePieceDrop(chapterPiece, undefined);

      expectNoOp(chapterData);
    });

    it("logs an error and no-ops if no data found for piece", () => {
      pieceDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handlePieceDrop(chapterPiece, undefined);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ScripturePieceDropService: pieceData not found at handlePieceDrop."
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(pieceAdapterPort.releaseTransformer).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(pieceDropEventPort.emit).not.toHaveBeenCalled();
    });

    it("no-ops if the piece is within a not opened bible", () => {
      const chains = [
        makeParentDataChain({ bibleData: makeBibleData(BibleStates.Closed) }),
        makeParentDataChain({ bibleData: makeBibleData() }),
        makeParentDataChain({ bibleData: undefined }),
      ];

      for (const chain of chains) {
        vi.clearAllMocks();
        const { chapterData } = arrangeChapter(makeChapterData(), chain);

        service.handlePieceDrop(chapterPiece, undefined);

        expectNoOp(chapterData);
      }
    });

    it("no-ops if the piece is not draggable", () => {
      const { chapterData } = arrangeChapter(makeChapterData());
      pieceAdapterPort.isPieceAnchored.mockReturnValue(true);

      service.handlePieceDrop(chapterPiece, undefined);

      expectNoOp(chapterData);
    });

    it("ends the piece's drag", () => {
      const dropEvents = [undefined, dropOverPieceEvent];

      for (const dropEvent of dropEvents) {
        const { chapterData } = arrangeChapter(makeChapterData());

        service.handlePieceDrop(chapterPiece, dropEvent);

        expect(chapterData.isBeingDragged).toBe(false);
      }
    });

    it("places the piece on the ground if not dropping it over other piece and piece is not already on the ground", () => {
      const groundedChapter = arrangeChapter(makeChapterData()).chapterData;
      service.handlePieceDrop(chapterPiece, undefined);

      const overPieceChapter = arrangeChapter(makeChapterData()).chapterData;
      service.handlePieceDrop(chapterPiece, dropOverPieceEvent);

      expect(groundedChapter.isOnTheGround).toBe(true);
      expect(overPieceChapter.isOnTheGround).toBe(false);
    });

    it("makes the piece highlightable if not dropping it over other piece and piece is not already on the ground", () => {
      const groundedChapter = arrangeChapter(makeChapterData()).chapterData;
      service.handlePieceDrop(chapterPiece, undefined);

      const overPieceChapter = arrangeChapter(makeChapterData()).chapterData;
      service.handlePieceDrop(chapterPiece, dropOverPieceEvent);

      const alreadyGroundedChapter = arrangeChapter(
        makeChapterData({ isOnTheGround: true })
      ).chapterData;
      service.handlePieceDrop(chapterPiece, undefined);

      expect(groundedChapter.isHighlightable).toBe(true);
      expect(overPieceChapter.isHighlightable).toBe(false);
      expect(alreadyGroundedChapter.isHighlightable).toBe(false);
    });

    it("releases the piece's transformer if it has one", () => {
      arrangeChapter(makeChapterData());

      service.handlePieceDrop(chapterPiece, undefined);

      expect(pieceAdapterPort.releaseTransformer).not.toHaveBeenCalled();

      pieceAdapterPort.hasTransformer.mockReturnValue(true);
      arrangeChapter(makeChapterData());

      service.handlePieceDrop(chapterPiece, dropOverPieceEvent);

      expect(
        pieceAdapterPort.releaseTransformer
      ).toHaveBeenCalledExactlyOnceWith({
        piece: chapterPiece,
        updatePosition: true,
      });
    });

    it("deselects and selects the piece after if it is a selected chapter, not dropping it over other piece and piece is not already on the ground", async () => {
      const bookData = makeBookData();
      const { chapterData } = arrangeChapter(
        makeChapterData({ isSelected: true }),
        makeParentDataChain({ bookData })
      );
      const deselect = createDeferred();
      chapterSelectionServicePort.deselectChapter.mockReturnValue(
        deselect.promise
      );

      service.handlePieceDrop(chapterPiece, undefined);
      await flushMicrotasks();

      expect(
        chapterSelectionServicePort.deselectChapter
      ).toHaveBeenCalledExactlyOnceWith({ data: chapterData });
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).not.toHaveBeenCalled();

      deselect.resolve();
      await flushMicrotasks();

      expect(
        chapterSelectionServicePort.trySelectChapter
      ).toHaveBeenCalledExactlyOnceWith({ data: chapterData, bookData });
    });

    it("prefers book over section book for the chapter select", async () => {
      const bookData = makeBookData();
      const sectionBookData = makeSectionBookData();
      const { chapterData } = arrangeChapter(
        makeChapterData({ isSelected: true }),
        makeParentDataChain({ bookData, sectionBookData })
      );

      service.handlePieceDrop(chapterPiece, undefined);
      await flushMicrotasks();

      expect(
        chapterSelectionServicePort.trySelectChapter
      ).toHaveBeenCalledExactlyOnceWith({ data: chapterData, bookData });

      vi.clearAllMocks();
      const { chapterData: sectionChapterData } = arrangeChapter(
        makeChapterData({ isSelected: true }),
        makeParentDataChain({ sectionBookData })
      );

      service.handlePieceDrop(chapterPiece, undefined);
      await flushMicrotasks();

      expect(
        chapterSelectionServicePort.trySelectChapter
      ).toHaveBeenCalledExactlyOnceWith({
        data: sectionChapterData,
        bookData: sectionBookData,
      });
    });

    it("tries to highlight the piece if it is focused and it is not a just-grounded selected chapter", async () => {
      const highlightCases = [
        {
          chapterData: makeChapterData({ isFocused: true }),
          dropEvent: undefined,
        },
        {
          chapterData: makeChapterData({ isFocused: true, isSelected: true }),
          dropEvent: dropOverPieceEvent,
        },
        {
          chapterData: makeChapterData({
            isFocused: true,
            isSelected: true,
            isOnTheGround: true,
          }),
          dropEvent: undefined,
        },
      ];

      for (const { chapterData, dropEvent } of highlightCases) {
        vi.clearAllMocks();
        arrangeChapter(chapterData);

        service.handlePieceDrop(chapterPiece, dropEvent);
        await flushMicrotasks();

        expect(
          pieceHighlightServicePort.tryHighlightPiece
        ).toHaveBeenCalledExactlyOnceWith({
          piece: chapterPiece,
          source: HighlightRequestSources.UserDrop,
        });
      }

      const noHighlightCases = [
        { chapterData: makeChapterData(), dropEvent: undefined },
        {
          chapterData: makeChapterData({ isFocused: true, isSelected: true }),
          dropEvent: undefined,
        },
      ];

      for (const { chapterData, dropEvent } of noHighlightCases) {
        vi.clearAllMocks();
        arrangeChapter(chapterData);

        service.handlePieceDrop(chapterPiece, dropEvent);
        await flushMicrotasks();

        expect(
          pieceHighlightServicePort.tryHighlightPiece
        ).not.toHaveBeenCalled();
      }
    });

    it("emits at the end", () => {
      const { chapterData } = arrangeChapter(makeChapterData());
      pieceAdapterPort.hasTransformer.mockReturnValue(true);
      let stateAtEmit:
        | {
            isBeingDragged: boolean;
            isOnTheGround: boolean;
            isHighlightable: boolean;
            hasReleasedTransformer: boolean;
          }
        | undefined;
      pieceDropEventPort.emit.mockImplementation(() => {
        stateAtEmit = {
          isBeingDragged: chapterData.isBeingDragged,
          isOnTheGround: chapterData.isOnTheGround,
          isHighlightable: chapterData.isHighlightable,
          hasReleasedTransformer:
            pieceAdapterPort.releaseTransformer.mock.calls.length > 0,
        };
      });

      service.handlePieceDrop(chapterPiece, undefined);

      expect(pieceDropEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnStackPieceDrop",
        { data: chapterData }
      );
      expect(stateAtEmit).toEqual({
        isBeingDragged: false,
        isOnTheGround: true,
        isHighlightable: true,
        hasReleasedTransformer: true,
      });
    });
  });
});
