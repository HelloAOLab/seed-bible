import {
  BibleStates,
  type Piece,
  type DropEvent,
} from "../../domain/models/canvas";
import type {
  PieceAdapterPort,
  ScripturePieceDropDataRepositoryPort,
} from "../ports/scripturePieceDrop";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { ScripturePieceDropServicePort } from "../ports/in/ScripturePieceDrop";
import { HighlightRequestSources } from "../../domain/models/pieces";
import type { LoggerPort } from "../ports/out/Logger";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import type { ParentDataIds } from "../../domain/models/canvas";
import type { ChapterSelectionServicePort } from "../ports/in/ChapterSelection";
import type { PieceHighlightServicePort } from "../ports/in/PieceHighlight";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceDropDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  chapterSelectionServicePort: ChapterSelectionServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
  eventManagerPort: EventManagerPort<BibleStackEvents>;
  loggerPort: LoggerPort;
}

// prettier-ignore
export class ScripturePieceDropService implements ScripturePieceDropServicePort {
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #chapterSelectionServicePort: ServiceParams["chapterSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #eventManagerPort: ServiceParams["eventManagerPort"];
  #loggerPort: ServiceParams['loggerPort']
  
  constructor({
    
    pieceAdapterPort,
    pieceDataRepositoryPort,
    sequenceStateServicePort,
    pieceHierarchyServicePort,
    chapterSelectionServicePort,
    pieceHighlightServicePort,
    eventManagerPort,
    loggerPort
  }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#chapterSelectionServicePort = chapterSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#eventManagerPort = eventManagerPort;
    this.#loggerPort = loggerPort;
  }

  handlePieceDrop(
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">,
    dropEvent: DropEvent | undefined
  ) {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const pieceData = this.#pieceDataRepositoryPort.getPieceData(piece);

    if (!pieceData) {
      this.#loggerPort.error(
        "ScripturePieceDropService: pieceData not found at handlePieceDrop."
      );
      return;
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      pieceData.parentDataIds ?? {}
    );

    if (
      bibleData?.currentState !== BibleStates.Open ||
      this.#pieceAdapterPort.isPieceAnchored(piece)
    )
      return;

    let justGrounded;
    pieceData.endDrag();
    if (!dropEvent?.to.piece && !pieceData.isOnTheGround) {
      justGrounded = true;
      pieceData.placeOnGround();
      pieceData.becomeHighlightable();
    }
    if (this.#pieceAdapterPort.hasTransformer(piece)) {
      this.#pieceAdapterPort.releaseTransformer({
        piece,
        updatePosition: true,
      });
    }
    if (
      pieceData.type === "StackChapter" &&
      pieceData.isSelected &&
      justGrounded
    ) {
      const { sectionBookData, bookData } =
        this.#pieceHierarchyServicePort.getParentDataChain(
          pieceData.parentDataIds as ParentDataIds
        );
      const actualData = bookData ?? sectionBookData;
      this.#chapterSelectionServicePort
        .deselectChapter({ data: pieceData })
        .then(() => {
          this.#chapterSelectionServicePort.trySelectChapter({
            data: pieceData,
            bookData: actualData,
          });
        });
    } else {
      if (pieceData.isFocused) {
        this.#pieceHighlightServicePort.tryHighlightPiece({
          piece,
          source: HighlightRequestSources.UserDrop,
        });
      }
    }

    this.#eventManagerPort.emit("OnStackPieceDrop", { data: pieceData });
  }
}
