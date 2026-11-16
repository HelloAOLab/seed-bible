import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";

export interface InteractionRegistryPort {
  handleBibleInteracted(data: StackBibleData): void;
  handleBibleDeleted(bibleId: StackBibleData["id"]): void;
  handleTestamentInteracted(data: StackTestamentData): void;
  handleTestamentDeleted(id: StackTestamentData["id"]): void;
  handleSectionInteracted(data: StackSectionData): void;
  handleSectionDeleted(id: StackSectionData["id"]): void;
  handleBookInteracted(data: StackBookData | StackSectionBookData): void;
  handleBookDeleted(id: StackSectionBookData["id"] | StackBookData["id"]): void;
  handleChapterInteracted(data: StackChapterData): void;
  clearAllLastInteractions(): void;
}
