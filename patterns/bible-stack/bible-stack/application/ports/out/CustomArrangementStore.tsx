import type { ArrangementInfo } from "../../../domain/models/arrangement";

export interface CustomArrangementStorePort {
  tryAddArrangement: (arrangement: ArrangementInfo) => boolean;
  tryRemoveArrangement: (arrangement: ArrangementInfo) => boolean;
  getArrangements: () => ArrangementInfo[];
}
