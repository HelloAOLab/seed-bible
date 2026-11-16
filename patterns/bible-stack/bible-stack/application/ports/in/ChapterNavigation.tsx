import type { Piece } from "../../../domain/models/canvas";

export interface ChapterNavigationServicePort {
  openChapter(chapter: Piece<"StackChapter">): void;
}
