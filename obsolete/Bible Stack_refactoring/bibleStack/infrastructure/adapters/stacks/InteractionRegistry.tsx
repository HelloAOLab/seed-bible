import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackChapterData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";
import { BiblePiece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

export type RegistryMap = {
  [BiblePiece.StackTestament]: StackTestamentData | undefined;
  [BiblePiece.StackSection]: StackSectionData | undefined;
  [BiblePiece.StackBook]: StackSectionBookData | StackBookData | undefined;
  [BiblePiece.StackChapter]: StackChapterData | undefined;
  StackBible: StackBibleData | undefined;
};

export class InteractionRegistry {
  #registryMap: RegistryMap = {
    [BiblePiece.StackTestament]: undefined,
    [BiblePiece.StackSection]: undefined,
    [BiblePiece.StackBook]: undefined,
    [BiblePiece.StackChapter]: undefined,
    StackBible: undefined,
  };

  handleBibleInteracted(data: StackBibleData) {
    this.#registryMap["StackBible"] = data;
  }

  handleTestamentInteracted(data: StackTestamentData) {
    this.#registryMap["StackTestament"] = data;
  }

  handleSectionInteracted(data: StackSectionData) {
    this.#registryMap["StackSection"] = data;
  }

  handleBookInteracted(data: StackBookData | StackSectionBookData) {
    this.#registryMap["StackBook"] = data;
  }

  handleChapterInteracted(data: StackChapterData) {
    this.#registryMap["StackChapter"] = data;
  }

  getLastInteractedByType<K extends keyof RegistryMap>(
    type: K
  ): RegistryMap[K] {
    return this.#registryMap[type];
  }
}
