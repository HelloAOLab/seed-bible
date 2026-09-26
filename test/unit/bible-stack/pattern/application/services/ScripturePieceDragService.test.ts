import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceDragService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceDragService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { StackStructureServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackStructure";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import type {
  PieceAdapterPort,
  ScripturePieceDataRepositoryPort,
  SequenceStateServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import type { BookInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type BibleState,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";

const BIBLE_ID = "bible-id";
const BOOK_ID = "book-id";

const chapterPiece: Piece<"StackChapter"> = {
  id: "chapter-piece",
  type: "StackChapter",
};
const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };

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

const makeChapterData = (): StackChapterData => {
  const chapterData = new StackChapterData({
    id: "chapter-data",
    piece: chapterPiece,
    pieceInfo: { amountOfVerses: 10, number: 1 },
    parentDataIds: { stackBibleId: BIBLE_ID, stackBookId: BOOK_ID },
    isInsideBible: true,
    creationParams: { bookId: "GEN" },
  });
  chapterData.placeOnGround();
  chapterData.becomeHighlightable();
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

const createDeferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("pattern.bible-stack.application.services.ScripturePieceDragService", () => {
  let service: ScripturePieceDragService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let scripturePieceDataRepositoryPort: Mocked<ScripturePieceDataRepositoryPort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let stackStructureServicePort: Mocked<StackStructureServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  const arrangeDraggableChapter = (chain = makeParentDataChain()) => {
    const chapterData = makeChapterData();
    const unhighlight = createDeferred();
    scripturePieceDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
    pieceHierarchyServicePort.getParentDataChain.mockReturnValue(chain);
    pieceHighlightServicePort.tryUnhighlightPiece.mockReturnValue(
      unhighlight.promise
    );
    return { chapterData, chain, unhighlight };
  };

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn().mockReturnValue(false),
    };

    pieceAdapterPort = {
      isPieceAnchored: vi.fn().mockReturnValue(false),
    };

    scripturePieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<ScripturePieceDataRepositoryPort>;

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn().mockResolvedValue(undefined),
      isUnhighlightScheduled: vi.fn(),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    stackStructureServicePort = {
      pullOutPieceFromParent: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new ScripturePieceDragService({
      sequenceStateServicePort,
      pieceAdapterPort,
      scripturePieceDataRepositoryPort,
      pieceHierarchyServicePort,
      pieceHighlightServicePort,
      stackStructureServicePort,
      loggerPort,
    });
  });

  describe("handlePieceDrag", () => {
    it("no-ops if no data found for piece", async () => {
      scripturePieceDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      await service.handlePieceDrag(chapterPiece);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ScripturePieceDragService: data not found at handlePieceDrag."
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
      expect(
        stackStructureServicePort.pullOutPieceFromParent
      ).not.toHaveBeenCalled();
    });

    it("no-ops if there's an ongoing sequence, if the piece is not draggable or if the piece is within a non-opened bible", async () => {
      const cases = [
        {
          isThereAnOngoingSequence: true,
          isPieceAnchored: false,
          chain: makeParentDataChain(),
        },
        {
          isThereAnOngoingSequence: false,
          isPieceAnchored: true,
          chain: makeParentDataChain(),
        },
        {
          isThereAnOngoingSequence: false,
          isPieceAnchored: false,
          chain: makeParentDataChain({
            bibleData: makeBibleData(BibleStates.Closed),
          }),
        },
        {
          isThereAnOngoingSequence: false,
          isPieceAnchored: false,
          chain: makeParentDataChain({ bibleData: makeBibleData() }),
        },
      ];

      for (const testCase of cases) {
        vi.clearAllMocks();
        const chapterData = makeChapterData();
        scripturePieceDataRepositoryPort.getPieceData.mockReturnValue(
          chapterData
        );
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
          testCase.chain
        );
        sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(
          testCase.isThereAnOngoingSequence
        );
        pieceAdapterPort.isPieceAnchored.mockReturnValue(
          testCase.isPieceAnchored
        );

        await service.handlePieceDrag(chapterPiece);

        expect(
          pieceHighlightServicePort.tryUnhighlightPiece
        ).not.toHaveBeenCalled();
        expect(
          stackStructureServicePort.pullOutPieceFromParent
        ).not.toHaveBeenCalled();
        expect(chapterData.isOnTheGround).toBe(true);
        expect(chapterData.isBeingDragged).toBe(false);
        expect(chapterData.isHighlightable).toBe(true);
      }
    });

    it("awaits for the unhighlight try sequence, with UserDrag as source and Instant as pacing", async () => {
      const { unhighlight } = arrangeDraggableChapter();
      let hasFinished = false;

      const drag = service.handlePieceDrag(chapterPiece).then(() => {
        hasFinished = true;
      });
      await flushMicrotasks();

      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledExactlyOnceWith({
        piece: chapterPiece,
        source: UnhighlightRequestSources.UserDrag,
        pacing: HighlightPacings.Instant,
      });
      expect(hasFinished).toBe(false);

      unhighlight.resolve();
      await drag;

      expect(hasFinished).toBe(true);
    });

    it("picks the piece from the ground, after the unhighlight sequence", async () => {
      const { chapterData, unhighlight } = arrangeDraggableChapter();

      const drag = service.handlePieceDrag(chapterPiece);
      await flushMicrotasks();

      expect(chapterData.isOnTheGround).toBe(true);

      unhighlight.resolve();
      await drag;

      expect(chapterData.isOnTheGround).toBe(false);
    });

    it("begins the piece's drag, after the unhighlight sequence", async () => {
      const { chapterData, unhighlight } = arrangeDraggableChapter();

      const drag = service.handlePieceDrag(chapterPiece);
      await flushMicrotasks();

      expect(chapterData.isBeingDragged).toBe(false);

      unhighlight.resolve();
      await drag;

      expect(chapterData.isBeingDragged).toBe(true);
    });

    it("makes the piece non-highlightable, after the unhighlight sequence", async () => {
      const { chapterData, unhighlight } = arrangeDraggableChapter();

      const drag = service.handlePieceDrag(chapterPiece);
      await flushMicrotasks();

      expect(chapterData.isHighlightable).toBe(true);

      unhighlight.resolve();
      await drag;

      expect(chapterData.isHighlightable).toBe(false);
    });

    it("pulls out the piece from parent if there is any, after the unhighlight sequence", async () => {
      const chainsWithParents = [
        makeParentDataChain({ bookData: makeBookData() }),
        makeParentDataChain({ bibleData: undefined, bookData: makeBookData() }),
      ];

      for (const parentChain of chainsWithParents) {
        vi.clearAllMocks();
        const { chapterData, chain, unhighlight } =
          arrangeDraggableChapter(parentChain);

        const drag = service.handlePieceDrag(chapterPiece);
        await flushMicrotasks();

        expect(
          stackStructureServicePort.pullOutPieceFromParent
        ).not.toHaveBeenCalled();

        unhighlight.resolve();
        await drag;

        expect(
          stackStructureServicePort.pullOutPieceFromParent
        ).toHaveBeenCalledExactlyOnceWith({
          pieceData: chapterData,
          bibleData: chain.bibleData,
          testamentData: undefined,
          sectionData: undefined,
          sectionBookData: undefined,
          bookData: chain.bookData,
        });
      }

      vi.clearAllMocks();
      const { chapterData, unhighlight } = arrangeDraggableChapter(
        makeParentDataChain({ bibleData: undefined })
      );

      const drag = service.handlePieceDrag(chapterPiece);
      unhighlight.resolve();
      await drag;

      expect(chapterData.isBeingDragged).toBe(true);
      expect(
        stackStructureServicePort.pullOutPieceFromParent
      ).not.toHaveBeenCalled();
    });
  });
});
