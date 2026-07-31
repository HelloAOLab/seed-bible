import type {
  BiblePieceType,
  Piece,
  PieceSelectionSource,
  SelectionModality,
} from "bibleVizUtils.domain.models.canvas";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
  PieceBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
} from "bibleVizUtils.domain.models.canvas";

export interface BookInteractionServicePort {
  handleBookSelection: ({
    book,
    interaction,
  }: {
    book: Piece<"StackBook" | "StackSectionBook">;
    interaction: SelectionModality;
  }) => void;
  handleBookFocusBegin: (book: Piece<"StackBook" | "StackSectionBook">) => void;
  handleBookFocusEnd(book: Piece<"StackBook" | "StackSectionBook">): void;
}

export interface DragServicePort {
  handlePieceDrag: (
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">
  ) => Promise<void>;
}

export interface DraggingServicePort {
  handlePieceDragging: (
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">,
    draggingEvent: DomainDraggingEvent
  ) => void;
}

export interface DropServicePort {
  handlePieceDrop(
    piece: Piece<"StackSectionBook"> | Piece<"StackBook">,
    dropEvent: DomainDropEvent
  ): void;
}

export interface DraggingEventMapperPort {
  toDomain: (event: InfrastructureDraggingEvent) => DomainDraggingEvent;
}

export interface DropEventMapperPort {
  toDomain: (event: InfrastructureDropEvent) => DomainDropEvent;
}

export type BookDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;

export interface BookSelectionServicePort {
  selectBook: (params: {
    data: StackBookData | StackSectionBookData;
    pacing?: StackPresenceNavigationPacing;
    source: PieceSelectionSource;
  }) => void;
  deselectBook: (data: StackBookData | StackSectionBookData) => void;
}

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
}

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
}

export interface SelectionReleaseServicePort {
  handlePieceSelectionRelease(
    piece: Piece<"StackBook"> | Piece<"StackSectionBook">
  ): void;
}

export interface PieceMapperPort {
  toDomain: <T extends BiblePieceType>(bot: PieceBot<T>) => Piece<T>;
}
