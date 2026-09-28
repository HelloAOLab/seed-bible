import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
  PieceBot,
} from "../../infrastructure/models/casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
  Piece,
} from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";

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

export interface DraggingEventMapperPort {
  toDomain: (event: InfrastructureDraggingEvent) => DomainDraggingEvent;
}

export interface DropEventMapperPort {
  toDomain: (event: InfrastructureDropEvent) => DomainDropEvent;
}
