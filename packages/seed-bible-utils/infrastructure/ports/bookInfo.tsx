import type { ArrangementInfoConfig } from "../models/arrangement";

export interface ArrangementConfigProviderPort {
  getRawStaticArrangements: () => readonly ArrangementInfoConfig[];
}

export interface CustomArrangementStorePort {
  getRawArrangements: () => readonly ArrangementInfoConfig[];
}
