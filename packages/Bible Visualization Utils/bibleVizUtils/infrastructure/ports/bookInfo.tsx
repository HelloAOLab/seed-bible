import type { ArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";

export interface ArrangementConfigProviderPort {
  getRawStaticArrangements: () => readonly ArrangementInfo[];
}

export interface CustomArrangementStorePort {
  getRawArrangements: () => readonly ArrangementInfo[];
}
