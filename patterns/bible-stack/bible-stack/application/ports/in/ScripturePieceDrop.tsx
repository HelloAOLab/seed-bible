import type { DropEvent, Piece } from "../../../domain/models/canvas";

export interface ScripturePieceDropServicePort {
  handlePieceDrop(
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">,
    dropEvent: DropEvent | undefined
  ): void;
}
