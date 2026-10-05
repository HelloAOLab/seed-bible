import {
  BibleStates,
  type Piece,
  type DraggingEvent,
} from "../../domain/models/canvas";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { ScripturePieceDraggingServicePort } from "../ports/in/ScripturePieceDragging";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { PiecePort } from "../ports/out/Piece";
import type { PieceDataRepositoryPort } from "../ports/out/PieceDataRepository";

interface ServiceParams {
  pieceAdapterPort: PiecePort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
}

// prettier-ignore
export class ScripturePieceDraggingService implements ScripturePieceDraggingServicePort {
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

  handlePieceDragging(
    piece:
      | Piece<"StackChapter">
      | Piece<"StackBook">
      | Piece<"StackSectionBook">
      | Piece<"StackSection">
      | Piece<"StackTestament">,
    draggingEvent: DraggingEvent
  ) {
    if (
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      this.#pieceAdapterPort.isPieceAnchored(piece)
    )
      return;

    const pieceData = this.#pieceDataRepositoryPort.getPieceData(piece);

    if (!pieceData?.isBeingDragged) return;

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      pieceData.parentDataIds ?? {}
    );

    if (bibleData?.currentState !== BibleStates.Open) return;

    this.#pieceAdapterPort.updatePosition(piece, {
      x: draggingEvent.to.x,
      y: draggingEvent.to.y,
      z: 0,
    });
  }
}
