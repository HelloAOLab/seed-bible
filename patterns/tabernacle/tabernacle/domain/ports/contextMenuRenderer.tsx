import type { ExperienceKey, ExperienceKeyMap } from "../models/experience";
import type { VerseReference } from "../models/piece";

export interface ContextMenuRendererPort {
  toggleContextMenu<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E],
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void;
  hideContextMenu(): void;
}
