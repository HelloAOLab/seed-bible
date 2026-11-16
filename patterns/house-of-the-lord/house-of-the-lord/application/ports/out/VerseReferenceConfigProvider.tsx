import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { VerseReference } from "../../../domain/models/piece";

export interface VerseReferenceConfigProviderPort {
  getVersesForPiece<E extends ExperienceKey>({
    experienceKey,
    pieceKey,
  }: {
    experienceKey: E;
    pieceKey: ExperienceKeyMap[E];
  }): VerseReference[];
}
