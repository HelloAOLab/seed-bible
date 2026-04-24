import {
  BiblePiece,
  BibleState,
  type BiblePieceType,
  type Piece,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type {
  SequenceStateServicePort,
  PieceAdapterPort,
  ScripturePieceDataRepositoryPort,
} from "bibleStack.application.ports.scripturePieceDrag";
import type {
  PieceHierarchyServicePort,
  PieceHighlightServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import {
  UnhighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  pieceAdapterPort: PieceAdapterPort;
  scripturePieceDataRepositoryPort: ScripturePieceDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
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

export class ScripturePieceDragService {
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #scripturePieceDataRepositoryPort: ServiceParams["scripturePieceDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];

  constructor({
    sequenceStateServicePort,
    pieceAdapterPort,
    scripturePieceDataRepositoryPort,
    pieceHierarchyServicePort,
    pieceHighlightServicePort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#scripturePieceDataRepositoryPort = scripturePieceDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
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

    const particularReturnCondition =
      particularCondition &&
      !particularCondition({
        pieceAdapterPort: this.#pieceAdapterPort,
        piece,
      });

    if (
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      particularReturnCondition ||
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
    data.becomeNotHighlightable();

    if (
      bibleData ||
      testamentData ||
      sectionData ||
      sectionBookData ||
      bookData
    ) {
      thisBot.PullOutPieceFromParent({
        // TODO: Refactor this to a service method
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
