import type { Point3D } from "bibleVizUtils.domain.models.commonTypes";
import type { Piece, PieceKey } from "tabernacle.domain.models.piece";

export interface HitboxData {
  position: Point3D;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  form?: string;
}

export interface Hitbox {
  id: string;
  pieceId: Piece["id"];
  pieceKey: PieceKey;
}
