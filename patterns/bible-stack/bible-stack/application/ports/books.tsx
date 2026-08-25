import type { BiblePiece, Piece } from "../../domain/models/canvas";
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
