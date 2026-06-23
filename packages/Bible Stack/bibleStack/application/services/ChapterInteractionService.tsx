import { type Piece } from "bibleVizUtils.domain.models.canvas";
import type {
  ChapterInteractionServicePort,
  ChapterDataRepositoryPort,
  ChapterNavigationServicePort,
  // ChapterSelectionServicePort,
  UserPresenceServicePort,
} from "bibleStack.application.ports.chapters";
import type {
  PieceHierarchyServicePort,
  // PieceHighlightServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import {
  HighlightRequestSources,
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import type { ChapterSelectionPort } from "../ports/in/ChapterSelection";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";

interface ServiceParams {
  chapterDataRepositoryPort: ChapterDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  chapterSelectionServicePort: ChapterSelectionPort;
  pieceHighlighterPort: PieceHighlighterPort;
  chapterNavigationServicePort: ChapterNavigationServicePort;
  userPresenceServicePort: UserPresenceServicePort;
}

export class ChapterInteractionService implements ChapterInteractionServicePort {
  #chapterDataRepositoryPort: ServiceParams["chapterDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #chapterSelectionServicePort: ServiceParams["chapterSelectionServicePort"];
  #pieceHighlighterPort: ServiceParams["pieceHighlighterPort"];
  #chapterNavigationServicePort: ServiceParams["chapterNavigationServicePort"];
  #userPresenceServicePort: ServiceParams["userPresenceServicePort"];

  constructor({
    chapterDataRepositoryPort,
    pieceHierarchyServicePort,
    chapterSelectionServicePort,
    pieceHighlighterPort,
    chapterNavigationServicePort,
    userPresenceServicePort,
  }: ServiceParams) {
    this.#chapterDataRepositoryPort = chapterDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#chapterSelectionServicePort = chapterSelectionServicePort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#chapterNavigationServicePort = chapterNavigationServicePort;
    this.#userPresenceServicePort = userPresenceServicePort;
  }

  handleChapterSelection({
    chapter,
  }: {
    chapter: Piece<"StackChapter">;
  }): void {
    const chapterData = this.#chapterDataRepositoryPort.getPieceData(chapter);

    if (!chapterData) {
      throw new Error(
        "ChapterInteractionService: chapterData not found at handleChapterSelection."
      );
    }

    const { sectionBookData, bookData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        chapterData.parentDataIds as StackParentDataIds
      );
    const actualData = sectionBookData ?? bookData;

    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      BibleVizUtils.Functions.HighlightBiblePiece({ data: chapterData });
      return;
    }

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
      throw new Error(
        "ChapterInteractionService: chapterData not found at handleChapterFocusBegin."
      );
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
      throw new Error(
        "ChapterInteractionService: chapterData not found at handleChapterFocusEnd."
      );
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
