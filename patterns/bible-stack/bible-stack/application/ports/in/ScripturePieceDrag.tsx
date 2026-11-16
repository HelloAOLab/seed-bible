import type { Piece } from "../../../domain/models/canvas";

export interface ScripturePieceDragServicePort {
  handlePieceDrag(
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">
  ): Promise<void>;
}
