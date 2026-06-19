import type { BibleStackEvents } from "@packages/Bible Stack/bibleStack/domain/models/events";
import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

export interface BookSelectionEventPort {
  emit: <K extends "OnBookBeginDeselect" | "OnBookEndDeselect">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}

export interface PieceAdapterPort {
  makeInteractable(piece: Piece<"StackBook" | "StackSectionBook">): void;
}
