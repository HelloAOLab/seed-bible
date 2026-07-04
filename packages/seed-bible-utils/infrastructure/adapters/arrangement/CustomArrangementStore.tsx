import type { ArrangementInfoConfig } from "../../models/arrangement";
import type { CustomArrangementStorePort } from "@packages/seed-bible-utils/domain/ports/arrangement";
import type { CustomArrangementStorePort as BookInfoCustomArrangementStorePort } from "../../ports/bookInfo";
import type { ArrangementAdapter } from "./ArrangementAdapter";

interface StoreProps {
  initialArrangements?: ArrangementInfoConfig[];
  arrangementAdapter: ArrangementAdapter;
}

export class CustomArrangementStore
  implements CustomArrangementStorePort, BookInfoCustomArrangementStorePort
{
  #customArrangements: Map<
    ArrangementInfoConfig["name"],
    ArrangementInfoConfig
  >;
  #arrangementAdapter: StoreProps["arrangementAdapter"];

  constructor({ initialArrangements, arrangementAdapter }: StoreProps) {
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
    this.#arrangementAdapter = arrangementAdapter;
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
      this.#arrangementAdapter.toDomain(arrangement)
    );
  };

  getRawArrangements: () => readonly ArrangementInfoConfig[] = () => {
    return [...this.#customArrangements.values()];
  };
}
