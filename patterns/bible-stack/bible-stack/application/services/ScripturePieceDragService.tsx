import {
  BiblePieces,
  BibleStates,
  type BiblePiece,
  type Piece,
} from "../../domain/models/canvas";
import type { StackStructureServicePort } from "../ports/in/StackStructure";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import {
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import type { ScripturePieceDragServicePort } from "../ports/in/ScripturePieceDrag";
import type { LoggerPort } from "../ports/out/Logger";
import type { PieceHighlightServicePort } from "../ports/in/PieceHighlight";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { PiecePort } from "../ports/out/Piece";
import type { PieceDataRepositoryPort } from "../ports/out/PieceDataRepository";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  pieceAdapterPort: PiecePort;
  scripturePieceDataRepositoryPort: PieceDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
  stackStructureServicePort: StackStructureServicePort;
  loggerPort: LoggerPort;
}

type PieceConditionGetter = (params: {
  pieceAdapterPort: PiecePort;
  piece: Piece;
}) => boolean;

const baseConditionGetter: PieceConditionGetter = ({
  pieceAdapterPort,
  piece,
}) => {
  return !pieceAdapterPort.isPieceAnchored(piece);
};

const pieceConditionStrategy: Partial<
  Record<BiblePiece, PieceConditionGetter>
> = {
  [BiblePieces.StackTestament]: baseConditionGetter,
  [BiblePieces.StackSection]: baseConditionGetter,
  [BiblePieces.StackSectionBook]: baseConditionGetter,
  [BiblePieces.StackBook]: baseConditionGetter,
  [BiblePieces.StackChapter]: baseConditionGetter,
};

// prettier-ignore
export class ScripturePieceDragService implements ScripturePieceDragServicePort {
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #scripturePieceDataRepositoryPort: ServiceParams["scripturePieceDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #stackStructureServicePort: ServiceParams["stackStructureServicePort"];
  #loggerPort: ServiceParams['loggerPort']

  constructor({
    sequenceStateServicePort,
    pieceAdapterPort,
    scripturePieceDataRepositoryPort,
    pieceHierarchyServicePort,
    pieceHighlightServicePort,
    stackStructureServicePort,
    loggerPort
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#scripturePieceDataRepositoryPort = scripturePieceDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#stackStructureServicePort = stackStructureServicePort;
    this.#loggerPort = loggerPort;
  }

  async handlePieceDrag(
    piece:
      | Piece<"StackChapter">
      | Piece<"StackBook">
      | Piece<"StackSectionBook">
      | Piece<"StackSection">
      | Piece<"StackTestament">
  ) {
    const data = this.#scripturePieceDataRepositoryPort.getPieceData(piece);

    if (!data) {
      this.#loggerPort.error(
        "ScripturePieceDragService: data not found at handlePieceDrag."
      );
      return;
    }

    const particularCondition = pieceConditionStrategy[piece.type];

    const { bibleData, testamentData, sectionData, sectionBookData, bookData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        data.parentDataIds ?? {}
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
      (bibleData && bibleData.currentState !== BibleStates.Open)
    )
      return;

    await this.#pieceHighlightServicePort.tryUnhighlightPiece({
      piece,
      source: UnhighlightRequestSources.UserDrag,
      pacing: HighlightPacings.Instant,
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
