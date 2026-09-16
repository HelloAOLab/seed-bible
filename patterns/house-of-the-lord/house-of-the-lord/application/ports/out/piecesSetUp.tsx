import type { ExperienceKey } from "../../../domain/models/experience";

export interface PiecesRenderOrderPort {
  setOrder(experience: ExperienceKey): void;
}
