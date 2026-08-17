import type { ExperienceKey, ExperienceKeyMap } from "../models/experience";
import type { PieceVisibilityState } from "../models/piece";
import type { VerseReference } from "../models/piece";

export interface TabernacleVisualizerPort {
  applyMeshState<E extends ExperienceKey>(params: {
    experience: E;
    key: ExperienceKeyMap[E];
    state: PieceVisibilityState;
  }): Promise<void>;
  highlightPiece<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): void;
  stopHighlight(): void;
  toggleContextMenu<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E],
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void;
  hideContextMenu(): void;
}
