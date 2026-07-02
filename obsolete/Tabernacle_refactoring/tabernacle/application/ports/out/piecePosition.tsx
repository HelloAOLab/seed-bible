import type { Point3D } from "bibleVizUtils.domain.models.commonTypes";
import type { Piece, PieceKey } from "tabernacle.domain.models.piece";

export interface PiecesProviderPort {
  getAllPieces(): Piece[];
}

export interface DimensionProviderPort {
  getDimension(): string;
}

export interface PiecePositionUpdaterPort {
  updatePiecesPosition(
    piecesData: Array<{
      piece: Piece;
      position: Point3D;
    }>,
    dimension: string
  ): void;
}

export interface PiecePositionProviderPort {
  getPiecePosition<K extends PieceKey>(key: K): Point3D;
}
