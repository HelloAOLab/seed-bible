import { BibleStates, type Piece } from "../../domain/models/canvas";
import type {
  PieceAdapterPort,
  ScripturePieceSelectionReleaseDataRepositoryPort,
} from "../ports/scripturePieceSelectionRelease";
import type { SequenceStateServicePort } from "../ports/scripturePieceDrag";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type {
  TestamentSelectionReleaseServicePort,
  SectionSelectionReleaseServicePort,
  ChapterSelectionReleaseServicePort,
} from "../ports/in/ScripturePieceSelectionRelease";
import type { LoggerPort } from "../ports/out/Logger";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceSelectionReleaseDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  loggerPort: LoggerPort;
}

// prettier-ignore
export class ScripturePieceSelectionReleaseService implements TestamentSelectionReleaseServicePort, SectionSelectionReleaseServicePort, ChapterSelectionReleaseServicePort {
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #loggerPort: ServiceParams['loggerPort']

  constructor({
    pieceAdapterPort,
    pieceDataRepositoryPort,
    sequenceStateServicePort,
    pieceHierarchyServicePort,
    loggerPort
  }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#loggerPort = loggerPort;
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
      this.#loggerPort.error(
        "ScripturePieceSelectionReleaseService: pieceData not found at handlePieceSelectionRelease."
      );
      return;
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      pieceData.parentDataIds ?? {}
    );

    if (
      (bibleData && bibleData.currentState !== BibleStates.Open) ||
      this.#pieceAdapterPort.isPieceAnchored(piece)
    )
      return;

    this.#pieceAdapterPort.releaseSelectionOnPiece(piece);
  }
}
