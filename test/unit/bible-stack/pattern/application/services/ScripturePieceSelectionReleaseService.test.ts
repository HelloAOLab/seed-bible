import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceSelectionReleaseService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceSelectionReleaseService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";
import type {
  PieceAdapterPort,
  ScripturePieceSelectionReleaseDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceSelectionRelease";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import type { BookInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type BibleState,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";

const BIBLE_ID = "bible-id";

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
    id: "book-data",
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

describe("pattern.bible-stack.application.services.ScripturePieceSelectionReleaseService", () => {
  let service: ScripturePieceSelectionReleaseService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let pieceDataRepositoryPort: Mocked<ScripturePieceSelectionReleaseDataRepositoryPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  const arrangeBook = (chain: ParentDataChain = makeParentDataChain()) => {
    pieceDataRepositoryPort.getPieceData.mockReturnValue(makeBookData());
    pieceHierarchyServicePort.getParentDataChain.mockReturnValue(chain);
  };

  beforeEach(() => {
    pieceAdapterPort = {
      isPieceAnchored: vi.fn().mockReturnValue(false),
      releaseSelectionOnPiece: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<ScripturePieceSelectionReleaseDataRepositoryPort>;

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn().mockReturnValue(false),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new ScripturePieceSelectionReleaseService({
      pieceAdapterPort,
      pieceDataRepositoryPort,
      sequenceStateServicePort,
      pieceHierarchyServicePort,
      loggerPort,
    });
  });

  describe("handlePieceSelectionRelease", () => {
    it("no-ops if there is an ongoing sequence", () => {
      arrangeBook();
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      service.handlePieceSelectionRelease(bookPiece);

      expect(pieceAdapterPort.releaseSelectionOnPiece).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("logs an error and no-ops if no data found for piece", () => {
      pieceDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handlePieceSelectionRelease(bookPiece);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ScripturePieceSelectionReleaseService: pieceData not found at handlePieceSelectionRelease."
      );
      expect(pieceAdapterPort.releaseSelectionOnPiece).not.toHaveBeenCalled();
    });

    it("no-ops if piece is anchored", () => {
      arrangeBook();
      pieceAdapterPort.isPieceAnchored.mockReturnValue(true);

      service.handlePieceSelectionRelease(bookPiece);

      expect(pieceAdapterPort.releaseSelectionOnPiece).not.toHaveBeenCalled();
    });

    it("no-ops if piece is within a not opened bible", () => {
      const chains = [
        makeParentDataChain({ bibleData: makeBibleData(BibleStates.Closed) }),
        makeParentDataChain({ bibleData: makeBibleData() }),
      ];

      for (const chain of chains) {
        vi.clearAllMocks();
        arrangeBook(chain);

        service.handlePieceSelectionRelease(bookPiece);

        expect(pieceAdapterPort.releaseSelectionOnPiece).not.toHaveBeenCalled();
      }
    });

    it("releases the selection on the provided piece", () => {
      const chains = [
        makeParentDataChain(),
        makeParentDataChain({ bibleData: undefined }),
      ];

      for (const chain of chains) {
        vi.clearAllMocks();
        arrangeBook(chain);

        service.handlePieceSelectionRelease(bookPiece);

        expect(
          pieceAdapterPort.releaseSelectionOnPiece
        ).toHaveBeenCalledExactlyOnceWith(bookPiece);
      }
    });
  });
});
