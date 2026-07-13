import type { InteractionRegistryServicePort } from "../../../application/ports/experience";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../domain/entities/StackSectionData";
import { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import { BiblePieces } from "../../../domain/models/canvas";

export type RegistryMap = {
  [BiblePieces.StackTestament]: StackTestamentData | undefined;
  [BiblePieces.StackSection]: StackSectionData | undefined;
  [BiblePieces.StackBook]: StackSectionBookData | StackBookData | undefined;
  [BiblePieces.StackChapter]: StackChapterData | undefined;
  StackBible: StackBibleData | undefined;
};

export class InteractionRegistry implements InteractionRegistryServicePort {
  #registryMap: RegistryMap = {
    [BiblePieces.StackTestament]: undefined,
    [BiblePieces.StackSection]: undefined,
    [BiblePieces.StackBook]: undefined,
    [BiblePieces.StackChapter]: undefined,
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

  clearAllLastInteractions() {
    this.#registryMap[BiblePieces.StackTestament] = undefined;
    this.#registryMap[BiblePieces.StackSection] = undefined;
    this.#registryMap[BiblePieces.StackBook] = undefined;
    this.#registryMap[BiblePieces.StackChapter] = undefined;
    this.#registryMap.StackBible = undefined;
  }
}
