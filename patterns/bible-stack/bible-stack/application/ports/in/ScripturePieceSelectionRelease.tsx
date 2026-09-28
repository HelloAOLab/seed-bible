import type { Piece } from "../../../domain/models/canvas";

export interface TestamentSelectionReleaseServicePort {
  handlePieceSelectionRelease: (piece: Piece<"StackTestament">) => void;
}

export interface SectionSelectionReleaseServicePort {
  handlePieceSelectionRelease: (piece: Piece<"StackSection">) => void;
}

export interface ChapterSelectionReleaseServicePort {
  handlePieceSelectionRelease: (piece: Piece<"StackChapter">) => void;
}
