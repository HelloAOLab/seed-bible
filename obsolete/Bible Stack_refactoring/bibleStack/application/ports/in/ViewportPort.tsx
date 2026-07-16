import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

export interface ViewportPort {
  getVisiblePieces(): Piece[];
}
