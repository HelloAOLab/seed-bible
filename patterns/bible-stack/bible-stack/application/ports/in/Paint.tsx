import type { PaintablePieceData } from "../../../domain/models/pieces";

export interface PaintPort {
  changeColor(newColor: string): void;
  paint(piece: PaintablePieceData["piece"]): void;
  paint(data: PaintablePieceData): void;
  unpaint(piece: PaintablePieceData["piece"]): void;
  unpaint(data: PaintablePieceData): void;
  activate(): void;
  deactivate(): void;
  isActive: boolean;
}
