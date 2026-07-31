import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
} from "bibleVizUtils.infrastructure.models.casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
  Piece,
  PieceSelectionSource,
  SelectionModality,
} from "bibleVizUtils.domain.models.canvas";
import type { ChapterBot } from "bibleStack.models.stack";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";

export interface ChapterInteractionServicePort {
  handleChapterSelection(params: {
    chapter: Piece<"StackChapter">;
    interaction: SelectionModality;
  }): void;
  handleChapterFocusBegin(chapter: Piece<"StackChapter">): void;
  handleChapterFocusEnd(chapter: Piece<"StackChapter">): void;
}

export interface PieceMapperPort {
  toDomain: (bot: ChapterBot) => Piece<"StackChapter">;
}

export interface DragServicePort {
  handlePieceDrag: (piece: Piece<"StackChapter">) => Promise<void>;
}

export interface DraggingServicePort {
  handlePieceDragging: (
    piece: Piece<"StackChapter">,
    draggingEvent: DomainDraggingEvent
  ) => void;
}

export interface SelectionReleaseServicePort {
  handlePieceSelectionRelease: (piece: Piece<"StackChapter">) => void;
}

export interface DropServicePort {
  handlePieceDrop: (
    piece: Piece<"StackChapter">,
    dropEvent: DomainDropEvent
  ) => void;
}

export interface DraggingEventMapperPort {
  toDomain: (event: InfrastructureDraggingEvent) => DomainDraggingEvent;
}

export interface DropEventMapperPort {
  toDomain: (event: InfrastructureDropEvent) => DomainDropEvent;
}

export type ChapterDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;

export interface ChapterSelectionServicePort {
  deselectChapter(
    data: StackChapterData,
    setBibleAnimating?: boolean
  ): Promise<void>;
  trySelectChapter(params: {
    data: StackChapterData;
    bookData: StackBookData | StackSectionBookData | undefined;
  }): Promise<void>;
}

export interface UserPresenceServicePort {
  updateUserPresence(): void;
}

export interface ChapterNavigationServicePort {
  openChapter(chapter: Piece<"StackChapter">): void;
}
