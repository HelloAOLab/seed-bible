import type { Piece } from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
  releaseSelectionOnPiece: (piece: Piece) => void;
}

export type ScripturePieceSelectionReleaseDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;
