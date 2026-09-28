import type { Piece } from "../../domain/models/canvas";
import type { BibleStackEvents } from "../../domain/models/events";

export interface PieceAdapterPort {
  makePieceErasable: (piece: Piece) => void;
}

export interface StackStructureEventPort {
  emit: <K extends "OnStackPiecePulledOut">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
