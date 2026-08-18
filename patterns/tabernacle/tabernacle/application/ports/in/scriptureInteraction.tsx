import type { PieceKey } from "../../../domain/models/piece";

export interface VerseMenuClickHandlerPort {
  handleVerseMenuItemClick(key: PieceKey): Promise<void>;
}
