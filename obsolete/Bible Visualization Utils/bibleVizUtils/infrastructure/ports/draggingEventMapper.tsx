import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceBot } from "bibleVizUtils.infrastructure.models.casualos";

export interface PieceMapperPort {
  toDomain: (bot: PieceBot) => Piece;
  toInfrastructure: (piece: Piece) => PieceBot | undefined;
}

export interface DimensionPort {
  getCurrentDimension: () => string;
}

export interface DraggingEventMapperParams {
  pieceMapperPort: PieceMapperPort;
  dimensionPort: DimensionPort;
}
