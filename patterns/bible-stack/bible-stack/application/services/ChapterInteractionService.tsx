import { type Piece } from "../../domain/models/canvas";
import type {
  ChapterDataRepositoryPort,
  ChapterNavigationServicePort,
  UserPresenceServicePort,
} from "../ports/chapters";
import type { ChapterInteractionServicePort } from "../ports/in/ChapterInteraction";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import {
  HighlightRequestSources,
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import type { ChapterSelectionPort } from "../ports/in/ChapterSelection";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type { PaintPort } from "../ports/in/Paint";
import type { LoggerPort } from "../ports/out/Logger";

interface ServiceParams {
  chapterDataRepositoryPort: ChapterDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  chapterSelectionServicePort: ChapterSelectionPort;
  pieceHighlighterPort: PieceHighlighterPort;
  chapterNavigationServicePort: ChapterNavigationServicePort;
  userPresenceServicePort: UserPresenceServicePort;
  paintPort: PaintPort;
  loggerPort: LoggerPort;
}

export class ChapterInteractionService implements ChapterInteractionServicePort {
  #chapterDataRepositoryPort: ServiceParams["chapterDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #chapterSelectionServicePort: ServiceParams["chapterSelectionServicePort"];
  #pieceHighlighterPort: ServiceParams["pieceHighlighterPort"];
  #chapterNavigationServicePort: ServiceParams["chapterNavigationServicePort"];
  #userPresenceServicePort: ServiceParams["userPresenceServicePort"];
  #paintPort: ServiceParams["paintPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    chapterDataRepositoryPort,
    pieceHierarchyServicePort,
    chapterSelectionServicePort,
    pieceHighlighterPort,
    chapterNavigationServicePort,
    userPresenceServicePort,
    paintPort,
    loggerPort,
  }: ServiceParams) {
    this.#chapterDataRepositoryPort = chapterDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#chapterSelectionServicePort = chapterSelectionServicePort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#chapterNavigationServicePort = chapterNavigationServicePort;
    this.#userPresenceServicePort = userPresenceServicePort;
    this.#paintPort = paintPort;
    this.#loggerPort = loggerPort;
  }

  handleChapterSelection({
    chapter,
  }: {
    chapter: Piece<"StackChapter">;
  }): void {
    const chapterData = this.#chapterDataRepositoryPort.getPieceData(chapter);

    if (!chapterData) {
      this.#loggerPort.error(
        "ChapterInteractionService: chapterData not found at handleChapterSelection."
      );
      return;
    }

    if (!chapterData.parentDataIds) {
      this.#loggerPort.error(
        "ChapterInteractionService: chapterData.parentDataIds not defined at handleChapterSelection."
      );
      return;
    }

    if (this.#paintPort.isActive) {
      this.#paintPort.paint(chapterData);
      return;
    }

    const { sectionBookData, bookData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        chapterData.parentDataIds
      );

    const actualData = sectionBookData ?? bookData;

    if (chapterData.selectionState === "Selected") {
      if (!actualData) {
        this.#chapterSelectionServicePort.deselectChapter({
          data: chapterData,
          pacing: "Regular",
        });
      }
    } else if (chapterData.selectionState === "Idle") {
      if (chapterData.isOnTheGround) {
        this.#chapterSelectionServicePort
          .trySelectChapter({
            data: chapterData,
            bookData: actualData,
            pacing: "Regular",
          })
          .then(() => this.#userPresenceServicePort.updateUserPresence());
      } else {
        this.#chapterNavigationServicePort.openChapter(chapter);
      }
    }
  }

  handleChapterFocusBegin(chapter: Piece<"StackChapter">): void {
    const chapterData = this.#chapterDataRepositoryPort.getPieceData(chapter);

    if (!chapterData) {
      this.#loggerPort.error(
        "ChapterInteractionService: chapterData not found at handleChapterFocusBegin."
      );
      return;
    }

    chapterData.beginFocus();

    this.#pieceHighlighterPort.tryHighlightPiece({
      piece: chapter,
      source: HighlightRequestSources.UserFocus,
    });
  }

  handleChapterFocusEnd(chapter: Piece<"StackChapter">): void {
    const chapterData = this.#chapterDataRepositoryPort.getPieceData(chapter);

    if (!chapterData) {
      this.#loggerPort.error(
        "ChapterInteractionService: chapterData not found at handleChapterFocusEnd."
      );
      return;
    }

    chapterData.endFocus();

    if (chapterData.isBeingDragged) return;

    this.#pieceHighlighterPort.tryUnhighlightPiece({
      piece: chapter,
      source: UnhighlightRequestSources.UserUnfocus,
      pacing: HighlightPacings.Regular,
    });
  }
}
