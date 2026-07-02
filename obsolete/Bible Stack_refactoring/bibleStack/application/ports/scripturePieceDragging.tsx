import type { BiblePieceType, Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";

export interface PieceAdapterPort {
  updatePosition: (
    piece: Piece,
    position: { x: number; y: number; z: number }
  ) => void;
  isPieceAnchored: (piece: Piece<BiblePieceType>) => boolean;
}

export type ScripturePieceDraggingDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;
