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

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: ScripturePieceDropDataRepositoryPort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  chapterSelectionServicePort: ChapterSelectionPort;
  pieceHighlightServicePort: PieceHighlighterPort;
  pieceDropEventPort: PieceDropEventPort;
}

export class ScripturePieceDropService
  implements
    BookDropServicePort,
    TestamentDropServicePort,
    SectionDropServicePort,
    ChapterDropServicePort
{
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #chapterSelectionServicePort: ServiceParams["chapterSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #pieceDropEventPort: ServiceParams["pieceDropEventPort"];

  constructor({
    pieceAdapterPort,
    pieceDataRepositoryPort,
    sequenceStateServicePort,
    pieceHierarchyServicePort,
    chapterSelectionServicePort,
    pieceHighlightServicePort,
    pieceDropEventPort,
  }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#chapterSelectionServicePort = chapterSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#pieceDropEventPort = pieceDropEventPort;
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
      throw new Error(
        "ScripturePieceDropService: pieceData not found at handlePieceDrop."
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
      // setTag( // TODO: Understand the purpose of desiredPositionZ and determine where it belongs to.
      //   piece,
      //   "desiredPositionZ",
      //   newPosition ? newPosition.z : piecePosition.z
      // );
      if (pieceData.isFocused) {
        this.#pieceHighlightServicePort.tryHighlightPiece({
          piece,
          source: HighlightRequestSources.UserDrop,
        });
      }
    }

    this.#pieceDropEventPort.emit("OnStackPieceDrop", { piece });

    // TODO: Wire this event to a service that makes this piece the last interacted of its type
    // switch (true) {
    //   case data instanceof StackTestamentData:
    //     thisBot.vars.lastInteractedStackTestamentData = data;
    //     break;
    //   case data instanceof StackSectionData:
    //     thisBot.vars.lastInteractedStackSectionData = data;
    //     break;
    //   case data instanceof StackBookData:
    //     thisBot.vars.lastInteractedStackBookData = data;
    //     break;
    //   default:
    //     break;
    // }

    // TODO: Wire this event to a sound service that plays the StackPieceDrop sound
    //thisBot.PlaySound({ soundName: "StackPieceDrop" });
  }
}
