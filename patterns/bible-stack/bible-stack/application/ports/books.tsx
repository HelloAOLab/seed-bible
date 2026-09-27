import type {
  BiblePiece,
  Piece,
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
} from "../../domain/models/canvas";
import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
  PieceBot,
} from "../../infrastructure/models/casualos";
import type { PieceDataRepositoryPort } from "./out/PieceDataRepository";

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

export interface PieceMapperPort {
  toDomain: <T extends BiblePiece>(bot: PieceBot<T>) => Piece<T>;
}
