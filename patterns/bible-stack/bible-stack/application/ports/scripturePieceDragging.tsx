import type { BiblePiece, Piece } from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";

export interface PieceAdapterPort {
  updatePosition: (
    piece: Piece,
    position: { x: number; y: number; z: number }
  ) => void;
  isPieceAnchored: (piece: Piece<BiblePiece>) => boolean;
}

export type ScripturePieceDraggingDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;
