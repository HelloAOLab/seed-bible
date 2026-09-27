import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import {
  BibleStates,
  type Piece,
  type DropEvent,
} from "../../domain/models/canvas";
import type {
  PieceAdapterPort,
  ScripturePieceDropDataRepositoryPort,
} from "../ports/scripturePieceDrop";
import type { SequenceStateServicePort } from "../ports/scripturePieceDrag";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type {
  BookDropServicePort,
  TestamentDropServicePort,
  SectionDropServicePort,
  ChapterDropServicePort,
} from "../ports/in/ScripturePieceDrop";
import { HighlightRequestSources } from "../../domain/models/pieces";
import type { ChapterSelectionPort } from "../ports/in/ChapterSelection";
import type { LoggerPort } from "../ports/out/Logger";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import type { ParentDataIds } from "../../domain/models/canvas";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceDropDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  chapterSelectionServicePort: ChapterSelectionPort;
  pieceHighlightServicePort: PieceHighlighterPort;
  eventManagerPort: EventManagerPort<BibleStackEvents>;
  loggerPort: LoggerPort;
}

// prettier-ignore
export class ScripturePieceDropService implements BookDropServicePort, TestamentDropServicePort, SectionDropServicePort, ChapterDropServicePort {
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
