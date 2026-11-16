import type { Piece } from "../../../domain/models/canvas";

export interface ScripturePieceSelectionReleaseServicePort {
  handlePieceSelectionRelease(
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">
  ): void;
}
