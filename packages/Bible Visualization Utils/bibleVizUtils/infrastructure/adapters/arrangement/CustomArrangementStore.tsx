import type { ArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { CustomArrangementStorePort } from "bibleVizUtils.domain.ports.arrangement";

export class CustomArrangementStore implements CustomArrangementStorePort {
  #customArrangements: Map<ArrangementInfo["name"], ArrangementInfo>;

  constructor(initialArrangements?: ArrangementInfo[]) {
    const customArrangements: Map<ArrangementInfo["name"], ArrangementInfo> =
      new Map();
    if (initialArrangements) {
      for (const arrangement of initialArrangements) {
        customArrangements.set(arrangement.name, arrangement);
      }
    }
    this.#customArrangements = customArrangements;
  }

  tryAddArrangement(arrangement: ArrangementInfo): boolean {
    if (!this.#customArrangements.has(arrangement.name)) {
      this.#customArrangements.set(arrangement.name, arrangement);
      return true;
    }
    return false;
  }

  tryRemoveArrangement(arrangement: ArrangementInfo): boolean {
    if (this.#customArrangements.has(arrangement.name)) {
      this.#customArrangements.delete(arrangement.name);
      return true;
    }
    return false;
  }

  getArrangements(): ArrangementInfo[] {
    return [...this.#customArrangements.values()];
  }
}
