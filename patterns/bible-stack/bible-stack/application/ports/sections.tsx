import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
} from "../../infrastructure/models/casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
  Piece,
} from "../../domain/models/canvas";
import type { SectionBot } from "../../infrastructure/models/stack";

export interface PieceMapperPort {
  toDomain: (bot: SectionBot) => Piece<"StackSection">;
}

export interface DragServicePort {
  handlePieceDrag: (piece: Piece<"StackSection">) => Promise<void>;
}

export interface DraggingEventMapperPort {
  toDomain: (event: InfrastructureDraggingEvent) => DomainDraggingEvent;
}

export interface DropEventMapperPort {
  toDomain: (event: InfrastructureDropEvent) => DomainDropEvent;
}
