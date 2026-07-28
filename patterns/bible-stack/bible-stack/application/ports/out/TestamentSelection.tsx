import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { BibleStackEvents } from "../../../domain/models/events";
import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { HighlightPacing } from "../../../domain/models/pieces";

export interface TestamentSelectionAdapterPort {
  select: (
    data: StackTestamentData,
    pacing?: StackUpdatePacing | undefined
  ) => Promise<void>;
  // deselect: (data: StackTestamentData) => Promise<void>;
}

export interface TestamentSelectionPieceHighlighterPort {
  /**
   * Unhighlights every piece currently highlighted inside the given bible,
   * as a transition (so it runs even while a selection sequence is ongoing).
   */
  unhighlightBiblePieces: (
    bibleId: StackBibleData["id"],
    pacing?: HighlightPacing
  ) => Promise<void>;
}

export interface TestamentSelectionEventPort {
  emit: <K extends "OnTestamentBeginSelect" | "OnTestamentEndSelect">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
