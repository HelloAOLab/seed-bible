import type { ArrangementInfo } from "../../../domain/models/arrangement";

export interface ArrangementConfigProviderPort {
  getStaticArrangements: () => readonly ArrangementInfo[];
}

export interface CustomArrangementStorePort {
  tryAddArrangement: (arrangement: ArrangementInfo) => boolean;
  tryRemoveArrangement: (arrangement: ArrangementInfo) => boolean;
  getArrangements: () => ArrangementInfo[];
}
