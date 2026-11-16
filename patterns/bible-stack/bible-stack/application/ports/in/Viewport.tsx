import type { Piece } from "../../../domain/models/canvas";

export interface ViewportServicePort {
  getVisiblePieces(): Piece[];
}
