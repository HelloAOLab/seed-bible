import type { ArrangementInfoConfig } from "bibleVizUtils.infrastructure.models.arrangement";
import type { CustomArrangementStorePort } from "bibleVizUtils.domain.ports.arrangement";
import type { ArrangementAdapterPort } from "bibleVizUtils.domain.ports.arrangement";
import type { CustomArrangementStorePort as BookInfoCustomArrangementStorePort } from "../../ports/bookInfo";

interface StoreProps {
  initialArrangements?: ArrangementInfoConfig[];
  arrangementAdapterPort: ArrangementAdapterPort;
}

export class CustomArrangementStore
  implements CustomArrangementStorePort, BookInfoCustomArrangementStorePort
{
  #customArrangements: Map<
    ArrangementInfoConfig["name"],
    ArrangementInfoConfig
  >;
  #arrangementAdapterPort: StoreProps["arrangementAdapterPort"];

  constructor({ initialArrangements, arrangementAdapterPort }: StoreProps) {
    const customArrangements: Map<
      ArrangementInfoConfig["name"],
      ArrangementInfoConfig
    > = new Map();
    if (initialArrangements) {
      for (const arrangement of initialArrangements) {
        customArrangements.set(arrangement.name, arrangement);
      }
    }
    this.#customArrangements = customArrangements;
    this.#arrangementAdapterPort = arrangementAdapterPort;
  }

  tryAddArrangement(arrangement: ArrangementInfoConfig): boolean {
    if (!this.#customArrangements.has(arrangement.name)) {
      this.#customArrangements.set(arrangement.name, arrangement);
      return true;
    }
    return false;
  }

  tryRemoveArrangement(arrangement: ArrangementInfoConfig): boolean {
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

  getRawArrangements: () => readonly ArrangementInfoConfig[] = () => {
    return [...this.#customArrangements.values()];
  };
}
