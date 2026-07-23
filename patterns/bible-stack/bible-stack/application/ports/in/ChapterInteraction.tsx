import type { Piece, SelectionModality } from "../../../domain/models/canvas";

export interface ChapterInteractionServicePort {
  handleChapterSelection(params: {
    chapter: Piece<"StackChapter">;
    interaction: SelectionModality;
  }): void;
  handleChapterFocusBegin(chapter: Piece<"StackChapter">): void;
  handleChapterFocusEnd(chapter: Piece<"StackChapter">): void;
}
