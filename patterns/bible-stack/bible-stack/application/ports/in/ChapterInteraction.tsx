import type { Piece } from "../../../domain/models/canvas";

export interface ChapterInteractionServicePort {
  handleChapterSelection(params: { chapter: Piece<"StackChapter"> }): void;
  handleChapterFocusBegin(chapter: Piece<"StackChapter">): void;
  handleChapterFocusEnd(chapter: Piece<"StackChapter">): void;
}
