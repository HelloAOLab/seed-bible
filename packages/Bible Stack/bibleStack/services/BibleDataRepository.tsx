import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

export class PieceDataRepository {
  #biblesData: Set<StackBibleData> = new Set();

  constructor() {}

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

  getBibleData(): StackBibleData | undefined {
    // TODO: Create a mechanism to get a bible data
    return undefined;
  }

  getAllBiblesData(): StackBibleData[] {
    return [...this.#biblesData.values()];
  }
}
