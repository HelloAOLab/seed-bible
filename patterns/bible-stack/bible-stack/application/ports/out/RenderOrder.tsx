import type { Piece } from "../../../domain/models/canvas";

export interface RenderOrderPort {
  setSortedRenderOrder(pieces: Piece[]): void;
}
