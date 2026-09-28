import type { ExperienceKey } from "../../../domain/models/experience";

export interface UpdatePiecesPositionPort {
  updatePositions(experience: ExperienceKey): void;
}
