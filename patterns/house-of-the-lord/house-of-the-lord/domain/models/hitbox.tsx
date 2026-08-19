import type { Point3D } from "./commonTypes";
import type { Piece, PieceKey } from "./piece";

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
