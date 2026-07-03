import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";

export interface LabelDateEventPort {
  emit: <K extends "OnLabelDateFormatChange">(
    eventName: K,
    ...args: BibleVizUtilsEvents[K] extends undefined | void
      ? [payload?: BibleVizUtilsEvents[K]]
      : [payload: BibleVizUtilsEvents[K]]
  ) => void;
}
