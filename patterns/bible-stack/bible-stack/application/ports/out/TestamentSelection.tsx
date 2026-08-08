import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { Piece } from "../../../domain/models/canvas";
import type { BibleStackEvents } from "../../../domain/models/events";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface TestamentSelectionAdapterPort {
  select: (
    data: StackTestamentData,
    pacing?: StackUpdatePacing | undefined
  ) => Promise<void>;
  // deselect: (data: StackTestamentData) => Promise<void>;
}

export interface TestamentSelectionEventPort {
  emit: <K extends "OnTestamentBeginSelect" | "OnTestamentEndSelect">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}

export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}

export interface LabelSequenceConfigProviderPort {
  getShowSequenceDurationSeconds(pacing: StackUpdatePacing): number;
}

export interface PieceAdapterPort {
  makeInteractable(piece: Piece): void;
}
