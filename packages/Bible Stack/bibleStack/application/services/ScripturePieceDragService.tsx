import {
  BiblePiece,
  BibleState,
  type BiblePieceType,
  type Piece,
} from "bibleVizUtils.domain.models.canvas";
import type {
  SequenceStateServicePort,
  PieceAdapterPort,
  ScripturePieceDataRepositoryPort,
  StackStructureServicePort,
} from "bibleStack.application.ports.scripturePieceDrag";
import type {
  PieceHierarchyServicePort,
  PieceHighlightServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import {
  UnhighlightPacings,
  UnhighlightRequestSources,
} from "bibleStack.domain.models.pieces";
import type { DragServicePort as BookInteractionControllerDragServicePort } from "bibleStack.application.ports.books";
import type { DragServicePort as TestamentInteractionControllerDragServicePort } from "bibleStack.application.ports.testaments";
import type { DragServicePort as ChapterInteractionControllerDragServicePort } from "bibleStack.application.ports.chapters";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  pieceAdapterPort: PieceAdapterPort;
  scripturePieceDataRepositoryPort: ScripturePieceDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
  stackStructureServicePort: StackStructureServicePort;
}

type PieceConditionGetter = (params: {
  pieceAdapterPort: PieceAdapterPort;
  piece: Piece;
}) => boolean;

const bookConditionGetter: PieceConditionGetter = ({
  pieceAdapterPort,
  piece,
}) => {
  return !pieceAdapterPort.isPieceAnchored(piece);
};

const pieceConditionStrategy: Partial<
  Record<BiblePieceType, PieceConditionGetter>
> = {
  [BiblePiece.StackBook]: bookConditionGetter,
};

export class ScripturePieceDragService
  implements
    BookInteractionControllerDragServicePort,
    TestamentInteractionControllerDragServicePort,
    ChapterInteractionControllerDragServicePort
{
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #scripturePieceDataRepositoryPort: ServiceParams["scripturePieceDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #stackStructureServicePort: ServiceParams["stackStructureServicePort"];

  constructor({
    sequenceStateServicePort,
    pieceAdapterPort,
    scripturePieceDataRepositoryPort,
    pieceHierarchyServicePort,
    pieceHighlightServicePort,
    stackStructureServicePort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#scripturePieceDataRepositoryPort = scripturePieceDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#stackStructureServicePort = stackStructureServicePort;
  }

  async handlePieceDrag(
    piece:
      | Piece<"StackChapter">
      | Piece<"StackBook">
      | Piece<"StackSectionBook">
      | Piece<"StackSection">
      | Piece<"StackTestament">
  ) {
    const particularCondition = pieceConditionStrategy[piece.type];

    const data = this.#scripturePieceDataRepositoryPort.getPieceData(piece);

    if (!data) {
      throw new Error(
        "ScripturePieceDragService: data not found at handlePieceDrag."
      );
    }

    const { bibleData, testamentData, sectionData, sectionBookData, bookData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        data.parentDataIds as StackParentDataIds
      );

    const pieceConditionFails =
      particularCondition &&
      !particularCondition({
        pieceAdapterPort: this.#pieceAdapterPort,
        piece,
      });

    if (
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      pieceConditionFails ||
      bibleData?.currentState !== BibleState.Open
    )
      return;

    await this.#pieceHighlightServicePort.tryUnhighlightPiece({
      piece,
      source: UnhighlightRequestSources.UserDrag,
      pacing: UnhighlightPacings.Instant,
    });

    data.pickFromGround();
    data.beginDrag();
    data.becomeNonHighlightable();

    if (
      bibleData ||
      testamentData ||
      sectionData ||
      sectionBookData ||
      bookData
    ) {
      this.#stackStructureServicePort.pullOutPieceFromParent({
        pieceData: data,
        bibleData,
        testamentData,
        sectionData,
        sectionBookData,
        bookData,
      });
    }
  }
}
