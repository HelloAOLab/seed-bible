import type { ExperienceKey } from "../../../domain/models/experience";
import type { PieceKey } from "../../../domain/models/piece";

export interface ScriptureInteractionPort {
  handlePieceFocusRequest(key: PieceKey): void;
  handleExperienceShowRequest(experence: ExperienceKey): void;
}
