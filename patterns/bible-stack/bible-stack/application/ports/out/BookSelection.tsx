import type { BibleStackEvents } from "../../../domain/models/events";
import type { Piece } from "../../../domain/models/canvas";

export interface BookSelectionEventPort {
  emit: <
    K extends
      | "OnBookBeginDeselect"
      | "OnBookEndDeselect"
      | "OnBookBeginSelect"
      | "OnBookEndSelect",
  >(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}

export interface PieceAdapterPort {
  makeInteractable(piece: Piece<"StackBook" | "StackSectionBook">): void;
  makeNonInteractable(piece: Piece<"StackBook" | "StackSectionBook">): void;
}
