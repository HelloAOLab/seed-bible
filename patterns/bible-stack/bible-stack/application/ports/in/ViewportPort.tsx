import type { Piece } from "../../../domain/models/canvas";

export interface ViewportPort {
  getVisiblePieces(): Piece[];
}
