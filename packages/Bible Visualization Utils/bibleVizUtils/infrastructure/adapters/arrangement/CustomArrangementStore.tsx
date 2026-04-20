import type { ArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { CustomArrangementStorePort } from "bibleVizUtils.domain.ports.arrangement";
import type { ArrangementAdapterPort } from "bibleVizUtils.domain.ports.arrangement";

interface StoreProps {
  initialArrangements?: ArrangementInfo[];
  arrangementAdapterPort: ArrangementAdapterPort;
}

export class CustomArrangementStore implements CustomArrangementStorePort {
  #customArrangements: Map<ArrangementInfo["name"], ArrangementInfo>;
  #arrangementAdapterPort: StoreProps["arrangementAdapterPort"];

  constructor({ initialArrangements, arrangementAdapterPort }: StoreProps) {
    const customArrangements: Map<ArrangementInfo["name"], ArrangementInfo> =
      new Map();
    if (initialArrangements) {
      for (const arrangement of initialArrangements) {
        customArrangements.set(arrangement.name, arrangement);
      }
    }
    this.#customArrangements = customArrangements;
    this.#arrangementAdapterPort = arrangementAdapterPort;
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

  getArrangements: CustomArrangementStorePort["getArrangements"] = () => {
    return [...this.#customArrangements.values()].map((arrangement) =>
      this.#arrangementAdapterPort.toDomain(arrangement)
    );
  };
}
