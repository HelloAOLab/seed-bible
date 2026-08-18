import type { ExperienceKey, ExperienceKeyMap } from "../models/experience";
import type { PieceVisibilityState } from "../models/piece";

export interface PieceStatePort {
  applyMeshState<E extends ExperienceKey>(params: {
    experience: E;
    key: ExperienceKeyMap[E];
    state: PieceVisibilityState;
  }): Promise<void>;
}
