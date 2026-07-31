import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";

export interface HistoryModeEventPort {
  emit: <K extends "OnEnterHistoryMode" | "OnExitHistoryMode">(
    eventName: K,
    ...args: BibleVizUtilsEvents[K] extends undefined | void
      ? [payload?: BibleVizUtilsEvents[K]]
      : [payload: BibleVizUtilsEvents[K]]
  ) => void;
}
