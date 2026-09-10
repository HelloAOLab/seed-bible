import type { PieceKey } from "../../../domain/models/piece";

export interface ScriptureInteractionPort {
  handlePieceFocusRequest(key: PieceKey): void;
}
