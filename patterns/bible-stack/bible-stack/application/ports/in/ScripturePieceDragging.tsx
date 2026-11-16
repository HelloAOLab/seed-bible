import type { DraggingEvent, Piece } from "../../../domain/models/canvas";

export interface ScripturePieceDraggingServicePort {
  handlePieceDragging(
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">,
    draggingEvent: DraggingEvent
  ): void;
}
