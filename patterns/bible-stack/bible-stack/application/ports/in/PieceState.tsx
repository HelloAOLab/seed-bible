import type { Piece, PieceState } from "../../../domain/models/canvas";

export interface PieceStateServicePort {
  handlePieceStateChanged(params: {
    piece: Piece;
    changedProperties: Array<keyof PieceState>;
  }): void;
}
