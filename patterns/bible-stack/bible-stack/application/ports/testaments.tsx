import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
  PieceBot,
} from "../../infrastructure/models/casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
  Piece,
  SelectionModality,
} from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";

export interface TestamentInteractionServicePort {
  handleTestamentSelection({
    testament,
    interaction,
  }: {
    testament: Piece<"StackTestament">;
    interaction: SelectionModality;
  }): void;
  handleTestamentFocusBegin(testament: Piece<"StackTestament">): void;
}

export interface PieceMapperPort {
  toDomain: (bot: PieceBot<"StackTestament">) => Piece<"StackTestament">;
}

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
}

export type TestamentDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;

export interface DragServicePort {
  handlePieceDrag: (piece: Piece<"StackTestament">) => Promise<void>;
}

export interface DraggingServicePort {
  handlePieceDragging: (
    piece: Piece<"StackTestament">,
    draggingEvent: DomainDraggingEvent
  ) => void;
}

export interface SelectionReleaseServicePort {
  handlePieceSelectionRelease: (piece: Piece<"StackTestament">) => void;
}

export interface DropServicePort {
  handlePieceDrop: (
    piece: Piece<"StackTestament">,
    dropEvent: DomainDropEvent
  ) => void;
}

export interface DraggingEventMapperPort {
  toDomain: (event: InfrastructureDraggingEvent) => DomainDraggingEvent;
}

export interface DropEventMapperPort {
  toDomain: (event: InfrastructureDropEvent) => DomainDropEvent;
}
