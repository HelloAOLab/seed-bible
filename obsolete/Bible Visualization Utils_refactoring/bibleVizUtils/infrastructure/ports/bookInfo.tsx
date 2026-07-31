import type { ArrangementInfoConfig } from "bibleVizUtils.infrastructure.models.arrangement";

export interface ArrangementConfigProviderPort {
  getRawStaticArrangements: () => readonly ArrangementInfoConfig[];
}

export interface CustomArrangementStorePort {
  getRawArrangements: () => readonly ArrangementInfoConfig[];
}
