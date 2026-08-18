import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { VerseReference } from "../../../domain/models/piece";

export interface VerseReferenceConfigProviderPort {
  getVersesForPiece<E extends ExperienceKey>({
    experienceKey,
    pieceKey,
    currentBookId,
    currentChapter,
  }: {
    experienceKey: E;
    pieceKey: ExperienceKeyMap[E];
    currentBookId: string;
    currentChapter: number;
  }): { inChapter: VerseReference[]; inOtherChapters: VerseReference[] };
}
