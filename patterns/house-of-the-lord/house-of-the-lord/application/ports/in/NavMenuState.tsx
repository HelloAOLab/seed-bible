import type { ExperienceKey } from "../../../domain/models/experience";
import type { NavigationState } from "../../../domain/models/navigation";
import type { PieceKey } from "../../../domain/models/piece";
import type { ReadingState } from "../../../domain/models/scripture";

export interface NavMenuStatePort {
  getState(): NavigationState;
  open(): void;
  close(): void;
  toggle(): void;
  selectPiece(key: PieceKey): void;
  showPieceList(): void;
  clearSelection(): void;
  setExperience(experience: ExperienceKey): void;
  setReading(reading: ReadingState | null): void;
}
