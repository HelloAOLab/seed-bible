import type {
  BiblePiece,
  Piece,
  SelectionModality,
} from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";
import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
  PieceBot,
} from "../../infrastructure/models/casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
} from "../../domain/models/canvas";

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

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
}

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
  executeAsSequence(task: () => Promise<void>): Promise<void>;
}

export interface SelectionReleaseServicePort {
  handlePieceSelectionRelease(
    piece: Piece<"StackBook"> | Piece<"StackSectionBook">
  ): void;
}

export interface PieceMapperPort {
  toDomain: <T extends BiblePiece>(bot: PieceBot<T>) => Piece<T>;
}
