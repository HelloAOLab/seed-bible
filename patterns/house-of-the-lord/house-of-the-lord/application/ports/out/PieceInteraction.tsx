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

export interface ContextMenuRendererPort {
  toggleContextMenu<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E],
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void;
}

export interface PieceHighlightPort {
  highlightPiece<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): void;
}
