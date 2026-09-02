import type { ExperienceKey } from "../../../domain/models/experience";

export interface PanelDisplayerPort {
  displayPanel(): void;
}

export interface PiecesSequencePort {
  displayDropSequence(experience: ExperienceKey): Promise<void>;
}

export interface UpdatePiecesPositionPort {
  updatePositions(): void;
}
