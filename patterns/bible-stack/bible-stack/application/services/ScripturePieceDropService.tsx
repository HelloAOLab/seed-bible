import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import {
  BibleStates,
  type Piece,
  type DropEvent,
} from "../../domain/models/canvas";
import type {
  PieceAdapterPort,
  PieceDropEventPort,
  ScripturePieceDropDataRepositoryPort,
} from "../ports/scripturePieceDrop";
import type { SequenceStateServicePort } from "../ports/scripturePieceDrag";
import type { StackParentDataIds } from "../ports/pieces";
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

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceDropDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  chapterSelectionServicePort: ChapterSelectionPort;
  pieceHighlightServicePort: PieceHighlighterPort;
  pieceDropEventPort: PieceDropEventPort;
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
  #pieceDropEventPort: ServiceParams["pieceDropEventPort"];
  #loggerPort: ServiceParams['loggerPort']
  
  constructor({
    
    pieceAdapterPort,
    pieceDataRepositoryPort,
    sequenceStateServicePort,
    pieceHierarchyServicePort,
    chapterSelectionServicePort,
    pieceHighlightServicePort,
    pieceDropEventPort,
    loggerPort
  }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#chapterSelectionServicePort = chapterSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#pieceDropEventPort = pieceDropEventPort;
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
          pieceData.parentDataIds as StackParentDataIds
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

    this.#pieceDropEventPort.emit("OnStackPieceDrop", { data: pieceData });
  }
}
