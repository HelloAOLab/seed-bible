// import type { BibleDataRepositoryPort as StacksDataRepositoryPort } from "bibleStack.application.ports.stacks";
import type { BibleDataRepositoryPort as StacksDataRepositoryPort } from "../../../application/ports/stacks";
import type { BibleDataRepositoryPort as BibleLifecycleDataRepositoryPort } from "../../../application/ports/bibleLifecycle";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { BibleDataRepositoryPort as ViewportBibleDataRepositoryPort } from "../../../application/ports/out/ViewportService";
import type { BibleDataRepositoryPort as SpatialNavigationBibleDataRepositoryPort } from "../../../application/ports/out/SpatialNavigation";
import type { BibleDataRepositoryPort as PieceInteractabilityBibleDataRepositoryPort } from "../../../application/ports/out/PieceInteractability";

// prettier-ignore
export class BibleDataRepository implements StacksDataRepositoryPort, BibleLifecycleDataRepositoryPort, ViewportBibleDataRepositoryPort, SpatialNavigationBibleDataRepositoryPort, PieceInteractabilityBibleDataRepositoryPort {
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
