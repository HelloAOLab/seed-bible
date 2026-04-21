import type { BibleDataRepositoryPort } from "bibleStack.application.ports.stacks";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";

export class BibleDataRepository implements BibleDataRepositoryPort {
  #biblesData: Set<StackBibleData> = new Set();

  addBibleData(data: StackBibleData) {
    this.#biblesData.add(data);
  }

  removeBibleData(data: StackBibleData) {
    this.#biblesData.delete(data);
  }

  clearBiblesData(): StackBibleData[] {
    const bibles = [...this.#biblesData.values()];
    this.#biblesData.clear();
    return bibles;
  }

  getBibleDataById(id: StackBibleData["id"]): StackBibleData | undefined {
    for (const data of this.#biblesData) {
      if (data.id === id) {
        return data;
      }
    }
    return undefined;
  }

  getAllBiblesData(): StackBibleData[] {
    return [...this.#biblesData.values()];
  }
}
