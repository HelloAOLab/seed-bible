import { BibleStates, type Piece } from "../../domain/models/canvas";
import type {
  PieceAdapterPort,
  ScripturePieceSelectionReleaseDataRepositoryPort,
} from "../ports/scripturePieceSelectionRelease";
import type { SequenceStateServicePort } from "../ports/scripturePieceDrag";
import type {
  PieceHierarchyServicePort,
  StackParentDataIds,
} from "../ports/pieces";
import type { SelectionReleaseServicePort as TestamentControllerSelectionReleaseServicePort } from "../ports/testaments";
import type { SelectionReleaseServicePort as SectionControllerSelectionReleaseServicePort } from "../ports/sections";
import type { SelectionReleaseServicePort as ChapterControllerSelectionReleaseServicePort } from "../ports/chapters";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceSelectionReleaseDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
}

export class ScripturePieceSelectionReleaseService
  implements
    TestamentControllerSelectionReleaseServicePort,
    SectionControllerSelectionReleaseServicePort,
    ChapterControllerSelectionReleaseServicePort
{
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];

  constructor({
    pieceAdapterPort,
    pieceDataRepositoryPort,
    sequenceStateServicePort,
    pieceHierarchyServicePort,
  }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
  }

  handlePieceSelectionRelease(
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">
  ) {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const pieceData = this.#pieceDataRepositoryPort.getPieceData(piece);

    if (!pieceData) {
      throw new Error(
        "ScripturePieceSelectionReleaseService: pieceData not found at handlePieceSelectionRelease."
      );
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      pieceData.parentDataIds as StackParentDataIds
    );

    if (
      bibleData?.currentState !== BibleStates.Open ||
      this.#pieceAdapterPort.isPieceAnchored(piece)
    )
      return;

    this.#pieceAdapterPort.releaseSelectionOnPiece(piece);
  }
}
