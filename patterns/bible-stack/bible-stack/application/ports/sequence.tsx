import type { BibleStackEvents } from "../../domain/models/events";

export interface SequenceEventPort {
  emit: <K extends "OnStackSequenceStart" | "OnStackSequenceEnd">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
