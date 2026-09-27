import type { Piece } from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";
import type { HighlightRequestSource } from "../../domain/models/pieces";

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
  hasTransformer(piece: Piece): boolean;
  releaseTransformer(params: { piece: Piece; updatePosition?: boolean }): void;
}

export type ScripturePieceDropDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;

export interface PieceHighlightServicePort {
  tryHighlightPiece: (params: {
    piece: Piece;
    source: HighlightRequestSource;
  }) => Promise<void>;
}
