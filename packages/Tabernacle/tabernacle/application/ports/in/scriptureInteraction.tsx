import type { PieceKey } from "tabernacle.domain.models.piece";

export interface VerseMenuClickHandlerPort {
  handleVerseMenuItemClick(key: PieceKey): Promise<void>;
}
