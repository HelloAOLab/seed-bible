import type { Piece } from "../../domain/models/canvas";

export interface PieceAdapterPort {
  makePieceErasable: (piece: Piece) => void;
}
