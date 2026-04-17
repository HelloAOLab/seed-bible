import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";
import type { ArrangementInfo } from "bibleVizUtils.domain.models.arrangement";

export interface ArrangementRepositoryPort {
  getStaticArrangements: () => ArrangementInfo[];
}

export interface ArrangementEventPort {
  emit: <K extends "OnArrangementIndexChanged" | "OnCustomArrangementsChanged">(
    eventName: K,
    ...args: BibleVizUtilsEvents[K] extends undefined | void
      ? [payload?: BibleVizUtilsEvents[K]]
      : [payload: BibleVizUtilsEvents[K]]
  ) => void;
}

export interface CustomArrangementStorePort {
  tryAddArrangement: (arrangement: ArrangementInfo) => boolean;
  tryRemoveArrangement: (arrangement: ArrangementInfo) => boolean;
  getArrangements: () => ArrangementInfo[];
}
