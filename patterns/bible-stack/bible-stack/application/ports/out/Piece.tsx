import type { Piece } from "../../../domain/models/canvas";

export interface PiecePort {
  isPieceAnchored: (piece: Piece) => boolean;
  anchorPiece(piece: Piece): void;
  unanchorPiece(piece: Piece): void;
  makePieceErasable: (piece: Piece) => void;
  releaseSelectionOnPiece: (piece: Piece) => void;
  updatePosition: (
    piece: Piece,
    position: { x: number; y: number; z: number }
  ) => void;
  isPieceBeingUsed(piece: Piece): boolean;
  hasTransformer(piece: Piece): boolean;
  releaseTransformer(params: { piece: Piece; updatePosition?: boolean }): void;
  isInteractable(piece: Piece): boolean;
  makeInteractable(piece: Piece): void;
  makeNonInteractable(piece: Piece): void;
  hide(piece: Piece): void;
}
