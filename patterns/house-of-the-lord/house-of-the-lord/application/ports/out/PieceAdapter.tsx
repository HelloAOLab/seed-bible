import type { Point3D } from "../../../domain/models/commonTypes";
import type {
  Piece,
  PieceVisibilityState,
  TabernaclePieceKey,
} from "../../../domain/models/piece";

export interface PieceAdapterPort {
  setPosition(piece: Piece, position: Point3D): void;
  getCurrentState(piece: Piece<TabernaclePieceKey>): PieceVisibilityState;
}
