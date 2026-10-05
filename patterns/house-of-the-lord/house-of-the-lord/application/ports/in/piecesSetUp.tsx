import type { ExperienceKey } from "../../../domain/models/experience";

export interface PiecesSetUpPort {
  setUpPieces(experience: ExperienceKey): void;
  clearPieces(experience: ExperienceKey): void;
}
