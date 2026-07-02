import type { Hitbox, HitboxData } from "tabernacle.domain.models.hitbox";
import type { Piece, PieceKey } from "tabernacle.domain.models.piece";

export interface PiecesProviderPort {
  getAllPieces(): Piece[];
}

export interface HitboxProviderPort {
  getHitboxData(key: PieceKey): HitboxData | null;
  getAnchorPoint(): string;
  isDraggable(): boolean;
  getColor(): string;
  isPointable(): boolean;
}

export interface HitboxSpawnerPort {
  spawn(params: { data: HitboxData; piece: Piece; dimension: string }): Hitbox;
}

export interface DimensionProvider {
  getDimension(): string;
}
