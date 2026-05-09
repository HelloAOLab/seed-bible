import {
  BibleState,
  type Piece,
  type DraggingEvent,
} from "bibleVizUtils.domain.models.canvas";
import type {
  PieceAdapterPort,
  ScripturePieceDraggingDataRepositoryPort,
} from "bibleStack.application.ports.scripturePieceDragging";
import type { SequenceStateServicePort } from "bibleStack.application.ports.scripturePieceDrag";
import type {
  PieceHierarchyServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import type { DraggingServicePort as TestamentControllerDraggingServicePort } from "bibleStack.application.ports.testaments";
import type { DraggingServicePort as SectionControllerDraggingServicePort } from "bibleStack.application.ports.sections";
import type { DraggingServicePort as ChapterControllerDraggingServicePort } from "bibleStack.application.ports.chapters";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceDraggingDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
}

export class ScripturePieceDraggingService
  implements
    TestamentControllerDraggingServicePort,
    SectionControllerDraggingServicePort,
    ChapterControllerDraggingServicePort
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

    if (bibleData?.currentState !== BibleState.Open) return;

    this.#pieceAdapterPort.updatePosition(piece, {
      x: draggingEvent.to.x,
      y: draggingEvent.to.y,
      z: 0,
    });
  }
}
