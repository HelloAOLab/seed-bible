import type { Piece } from "../../../domain/models/canvas";

export interface PieceLifecycleServicePort {
  clearPiece: (piece: Piece) => Promise<void>;
}
