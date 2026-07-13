import type { Piece } from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";
import type { HighlightRequestSource } from "../../domain/models/pieces";
import type { BibleStackEvents } from "../../domain/models/events";

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

export interface PieceDropEventPort {
  emit: <K extends "OnStackPieceDrop">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
