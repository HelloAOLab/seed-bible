import { type Piece } from "bibleVizUtils.domain.models.canvas";
import type {
  ChapterInteractionServicePort,
  ChapterDataRepositoryPort,
  ChapterNavigationServicePort,
  ChapterSelectionServicePort,
  UserPresenceServicePort,
} from "bibleStack.application.ports.chapters";
import type {
  PieceHierarchyServicePort,
  PieceHighlightServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import {
  HighlightRequestSources,
  UnhighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";

interface ServiceParams {
  chapterDataRepositoryPort: ChapterDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  chapterSelectionServicePort: ChapterSelectionServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
  chapterNavigationServicePort: ChapterNavigationServicePort;
  userPresenceServicePort: UserPresenceServicePort;
}

export class ChapterInteractionService implements ChapterInteractionServicePort {
  #chapterDataRepositoryPort: ServiceParams["chapterDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #chapterSelectionServicePort: ServiceParams["chapterSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #chapterNavigationServicePort: ServiceParams["chapterNavigationServicePort"];
  #userPresenceServicePort: ServiceParams["userPresenceServicePort"];

  constructor({
    chapterDataRepositoryPort,
    pieceHierarchyServicePort,
    chapterSelectionServicePort,
    pieceHighlightServicePort,
    chapterNavigationServicePort,
    userPresenceServicePort,
  }: ServiceParams) {
    this.#chapterDataRepositoryPort = chapterDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#chapterSelectionServicePort = chapterSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
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

    if (chapterData.isSelected) {
      if (!actualData && !chapterData.isDeselecting) {
        this.#chapterSelectionServicePort.deselectChapter(chapterData, true);
      }
    } else {
      if (chapterData.isSelecting) return;

      if (chapterData.isOnTheGround) {
        this.#chapterSelectionServicePort
          .trySelectChapter({ data: chapterData, bookData: actualData })
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

    this.#pieceHighlightServicePort.tryHighlightPiece({
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

    this.#pieceHighlightServicePort.tryUnhighlightPiece({
      piece: chapter,
      source: UnhighlightRequestSources.UserUnfocus,
      pacing: UnhighlightPacings.Regular,
    });
  }
}
