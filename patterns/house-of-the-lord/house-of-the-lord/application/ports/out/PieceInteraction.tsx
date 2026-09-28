import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { VerseReference } from "../../../domain/models/piece";

export interface ContextMenuRendererPort {
  toggleContextMenu<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E],
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void;
}
