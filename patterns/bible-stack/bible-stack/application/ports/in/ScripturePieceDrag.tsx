import type { Piece } from "../../../domain/models/canvas";

export interface BookDragServicePort {
  handlePieceDrag: (
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">
  ) => Promise<void>;
}

export interface TestamentDragServicePort {
  handlePieceDrag: (piece: Piece<"StackTestament">) => Promise<void>;
}

export interface ChapterDragServicePort {
  handlePieceDrag: (piece: Piece<"StackChapter">) => Promise<void>;
}
