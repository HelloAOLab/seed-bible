import {
  BibleStates,
  type Piece,
  type DraggingEvent,
} from "../../domain/models/canvas";
import type {
  PieceAdapterPort,
  ScripturePieceDraggingDataRepositoryPort,
} from "../ports/scripturePieceDragging";
import type { SequenceStateServicePort } from "../ports/scripturePieceDrag";
import type { StackParentDataIds } from "../ports/pieces";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type {
  TestamentDraggingServicePort,
  SectionDraggingServicePort,
  ChapterDraggingServicePort,
} from "../ports/in/ScripturePieceDragging";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceDraggingDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
}

export class ScripturePieceDraggingService
  implements
    TestamentDraggingServicePort,
    SectionDraggingServicePort,
    ChapterDraggingServicePort
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
      pieceData.parentDataIds as StackParentDataIds
    );

    if (bibleData?.currentState !== BibleStates.Open) return;

    this.#pieceAdapterPort.updatePosition(piece, {
      x: draggingEvent.to.x,
      y: draggingEvent.to.y,
      z: 0,
    });
  }
}
