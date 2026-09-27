import type { PaintablePieceData } from "../../../domain/models/pieces";

export interface PaintPort {
  paint(piece: NonNullable<PaintablePieceData["piece"]>, color: string): void;
  unpaint(piece: NonNullable<PaintablePieceData["piece"]>): void;
}
