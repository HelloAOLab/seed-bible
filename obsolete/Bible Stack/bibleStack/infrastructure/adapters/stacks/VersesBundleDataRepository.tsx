import type { VersesBundleData } from "bibleVizUtils.domain.entities.VersesBunbleData";
import type { VersesBundleDataRepositoryPort as PieceLifecycleRepositoryPort } from "bibleStack.application.ports.pieceLifecycle";
import type { VersesBundleDataRepositoryPort as VersesBundleInteractionRepositoryPort } from "bibleStack.application.ports.versesBundle";

export class VersesBundleRepository
  implements PieceLifecycleRepositoryPort, VersesBundleInteractionRepositoryPort
{
  #dataSet: Set<VersesBundleData> = new Set();

  addBundleData(data: VersesBundleData) {
    this.#dataSet.add(data);
  }

  removeBundleData(data: VersesBundleData) {
    this.#dataSet.delete(data);
  }

  clearBundlesData(): VersesBundleData[] {
    const bibles = [...this.#dataSet.values()];
    this.#dataSet.clear();
    return bibles;
  }

  getBundleDataById(id: VersesBundleData["id"]): VersesBundleData | undefined {
    for (const data of this.#dataSet) {
      if (data.id === id) {
        return data;
      }
    }
    return undefined;
  }

  getAllBundlesData(): VersesBundleData[] {
    return [...this.#dataSet.values()];
  }

  getBundleData(piece: NonNullable<VersesBundleData["piece"]>) {
    for (const data of this.#dataSet) {
      if (data.piece?.id === piece.id) {
        return data;
      }
    }
    return undefined;
  }
}
