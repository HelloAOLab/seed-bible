import type { BibleStackEvents } from "../../../domain/models/events";

export interface LabelDateEventPort {
  emit: <K extends "OnLabelDateFormatChange">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
