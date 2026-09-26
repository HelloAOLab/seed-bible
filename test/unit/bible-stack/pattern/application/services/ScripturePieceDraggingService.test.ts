import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceDraggingService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceDraggingService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";
import type {
  PieceAdapterPort,
  ScripturePieceDraggingDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDragging";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type BibleState,
  type DraggingEvent,
  type ParentDataIds,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";

const BIBLE_ID = "bible-id";
const BOOK_ID = "book-data";

const chapterPiece: Piece<"StackChapter"> = {
  id: "chapter-piece",
  type: "StackChapter",
};

const draggingEvent: DraggingEvent = {
  piece: chapterPiece,
  to: {
    piece: { id: "ground-piece", type: "StackBook" },
    x: 12,
    y: -7,
  },
  from: { x: 3, y: 4 },
};

const makeChapterData = ({
  parentDataIds = { stackBibleId: BIBLE_ID, stackBookId: BOOK_ID },
  isBeingDragged = true,
}: {
  parentDataIds?: ParentDataIds | null;
  isBeingDragged?: boolean;
} = {}): StackChapterData => {
  const chapterData = new StackChapterData({
    id: "chapter-data",
    piece: chapterPiece,
    pieceInfo: { amountOfVerses: 10, number: 1 },
    parentDataIds: (parentDataIds ?? undefined) as ParentDataIds,
    isInsideBible: true,
    creationParams: { bookId: BOOK_ID },
  });

  if (isBeingDragged) {
    chapterData.beginDrag();
  }

  return chapterData;
};

const makeBibleData = (
  currentState: BibleState = BibleStates.Open
): StackBibleData => {
  const bibleData = new StackBibleData({
    id: BIBLE_ID,
    childrenData: [],
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });
  bibleData.changeState(currentState);
  return bibleData;
};

const makeParentDataChain = (
  overrides: Partial<ParentDataChain> = {}
): ParentDataChain => ({
  bibleData: undefined,
  testamentData: undefined,
  sectionData: undefined,
  sectionBookData: undefined,
  bookData: undefined,
  ...overrides,
});

describe("pattern.bible-stack.application.services.ScripturePieceDraggingService", () => {
  let service: ScripturePieceDraggingService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let pieceDataRepositoryPort: Mocked<ScripturePieceDraggingDataRepositoryPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;

  beforeEach(() => {
    pieceAdapterPort = {
      updatePosition: vi.fn(),
      isPieceAnchored: vi.fn(() => false),
    };

    pieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<ScripturePieceDraggingDataRepositoryPort>;
    pieceDataRepositoryPort.getPieceData.mockReturnValue(makeChapterData());

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(() => false),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(() =>
        makeParentDataChain({ bibleData: makeBibleData() })
      ),
    };

    service = new ScripturePieceDraggingService({
      pieceAdapterPort,
      pieceDataRepositoryPort,
      sequenceStateServicePort,
      pieceHierarchyServicePort,
    });
  });

  describe("handlePieceDragging", () => {
    it("no-ops if there's an ongoing sequence or the piece is anchored", () => {
      const cases = [
        { ongoingSequence: true, anchored: false },
        { ongoingSequence: false, anchored: true },
        { ongoingSequence: true, anchored: true },
      ];

      for (const { ongoingSequence, anchored } of cases) {
        vi.clearAllMocks();
        sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(
          ongoingSequence
        );
        pieceAdapterPort.isPieceAnchored.mockReturnValue(anchored);

        service.handlePieceDragging(chapterPiece, draggingEvent);

        expect(pieceAdapterPort.updatePosition).not.toHaveBeenCalled();
        expect(pieceDataRepositoryPort.getPieceData).not.toHaveBeenCalled();
        expect(
          pieceHierarchyServicePort.getParentDataChain
        ).not.toHaveBeenCalled();
      }
    });

    it("no-ops if no data found for piece", () => {
      pieceDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handlePieceDragging(chapterPiece, draggingEvent);

      expect(pieceDataRepositoryPort.getPieceData).toHaveBeenCalledWith(
        chapterPiece
      );
      expect(pieceAdapterPort.updatePosition).not.toHaveBeenCalled();
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
    });

    it("no-ops if piece is not being dragged", () => {
      pieceDataRepositoryPort.getPieceData.mockReturnValue(
        makeChapterData({ isBeingDragged: false })
      );

      service.handlePieceDragging(chapterPiece, draggingEvent);

      expect(pieceAdapterPort.updatePosition).not.toHaveBeenCalled();
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
    });

    it("no-ops if piece is within a non-opened bible", () => {
      const cases = [
        makeParentDataChain(),
        makeParentDataChain({ bibleData: makeBibleData(BibleStates.Closed) }),
      ];

      for (const chain of cases) {
        vi.clearAllMocks();
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(chain);

        service.handlePieceDragging(chapterPiece, draggingEvent);

        expect(
          pieceHierarchyServicePort.getParentDataChain
        ).toHaveBeenCalledWith({
          stackBibleId: BIBLE_ID,
          stackBookId: BOOK_ID,
        });
        expect(pieceAdapterPort.updatePosition).not.toHaveBeenCalled();
      }
    });

    it("updates the piece's position with a fixed z of 0", () => {
      service.handlePieceDragging(chapterPiece, draggingEvent);

      expect(pieceAdapterPort.updatePosition).toHaveBeenCalledTimes(1);
      expect(pieceAdapterPort.updatePosition).toHaveBeenCalledWith(
        chapterPiece,
        { x: 12, y: -7, z: 0 }
      );
    });
  });
});
