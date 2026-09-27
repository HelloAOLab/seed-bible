import { BibleStates, type Piece } from "../../domain/models/canvas";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { ScripturePieceSelectionReleaseServicePort } from "../ports/in/ScripturePieceSelectionRelease";
import type { LoggerPort } from "../ports/out/Logger";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { PiecePort } from "../ports/out/Piece";
import type { PieceDataRepositoryPort } from "../ports/out/PieceDataRepository";

interface ServiceParams {
  pieceAdapterPort: PiecePort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  loggerPort: LoggerPort;
}

// prettier-ignore
export class ScripturePieceSelectionReleaseService implements ScripturePieceSelectionReleaseServicePort {
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
