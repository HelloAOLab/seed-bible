import type { VerseData } from "../../../domain/entities/VerseData";

export class VerseRepository {
  #dataSet: Set<VerseData> = new Set();

  addVerseData(data: VerseData) {
    this.#dataSet.add(data);
  }

  removeVerseData(data: VerseData) {
    this.#dataSet.delete(data);
  }

  clearVersesData(): VerseData[] {
    const verses = [...this.#dataSet.values()];
    this.#dataSet.clear();
    return verses;
  }

  getVerseDataById(id: VerseData["id"]): VerseData | undefined {
    for (const data of this.#dataSet) {
      if (data.id === id) {
        return data;
      }
    }
    return undefined;
  }

  getAllVersesData(): VerseData[] {
    return [...this.#dataSet.values()];
  }

  getVerseData(piece: NonNullable<VerseData["piece"]>) {
    for (const data of this.#dataSet) {
      if (data.piece?.id === piece.id) {
        return data;
      }
    }
    return undefined;
  }
}
