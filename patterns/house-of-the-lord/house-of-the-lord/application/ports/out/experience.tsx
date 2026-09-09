import type { ExperienceKey } from "../../../domain/models/experience";

export interface PiecesSequencePort {
  displayDropSequence(experience: ExperienceKey): Promise<void>;
  displayClearSequence(experience: ExperienceKey): Promise<void>;
  tryAbortCurrentDropSequence(): void;
}

export interface UpdatePiecesPositionPort {
  updatePositions(): void;
}
