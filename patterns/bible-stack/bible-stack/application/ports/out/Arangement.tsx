import type { ArrangementInfo } from "../../../domain/models/arrangement";
import type { BibleStackEvents } from "../../../domain/models/events";

export interface ArrangementConfigProviderPort {
  getStaticArrangements: () => readonly ArrangementInfo[];
}

export interface CustomArrangementStorePort {
  tryAddArrangement: (arrangement: ArrangementInfo) => boolean;
  tryRemoveArrangement: (arrangement: ArrangementInfo) => boolean;
  getArrangements: () => ArrangementInfo[];
}

export interface ArrangementEventPort {
  emit: <K extends "OnArrangementIndexChanged" | "OnCustomArrangementsChanged">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
