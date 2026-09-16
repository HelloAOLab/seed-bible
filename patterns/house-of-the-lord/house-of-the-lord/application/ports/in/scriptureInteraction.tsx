import type { ExperienceKey } from "../../../domain/models/experience";
import type { PieceKey } from "../../../domain/models/piece";

export interface ScriptureInteractionPort {
  handlePieceFocusRequest(
    experience: ExperienceKey,
    key: PieceKey
  ): Promise<void>;
}
