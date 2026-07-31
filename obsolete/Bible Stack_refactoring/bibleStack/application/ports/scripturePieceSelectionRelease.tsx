import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
  releaseSelectionOnPiece: (piece: Piece) => void;
}

export type ScripturePieceSelectionReleaseDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;
