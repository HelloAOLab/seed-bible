import type { BibleStackEvents } from "../../../domain/models/events";

export interface ExplodedViewEventPort {
  emit: <K extends "OnStackSectionExploded">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
