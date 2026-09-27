import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
} from "../../infrastructure/models/casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
  Piece,
} from "../../domain/models/canvas";
import type { ChapterBot } from "../../infrastructure/models/stack";
import type { PieceDataRepositoryPort } from "./out/PieceDataRepository";

export interface PieceMapperPort {
  toDomain: (bot: ChapterBot) => Piece<"StackChapter">;
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
