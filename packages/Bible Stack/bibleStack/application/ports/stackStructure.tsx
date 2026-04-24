import type { Piece } from "bibleVizUtils.domain.models.canvas";

export interface PieceAdapterPort {
  makePieceErasable: (piece: Piece) => void;
}
