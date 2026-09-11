import type { PieceKey } from "../../../domain/models/piece";

export interface PieceFocusPort {
  focus(key: PieceKey): void;
  clearFocus(): void;
}
