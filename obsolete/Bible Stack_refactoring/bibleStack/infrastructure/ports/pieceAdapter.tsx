import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceBot } from "bibleVizUtils.infrastructure.models.casualos";

export interface PieceMapperPort {
  toInfrastructure: (piece: Piece) => PieceBot | undefined;
}

export interface DimensionProviderPort {
  getDimension: () => string;
}

export interface PieceAdapterParams {
  pieceMapperPort: PieceMapperPort;
  dimensionProviderPort: DimensionProviderPort;
}
