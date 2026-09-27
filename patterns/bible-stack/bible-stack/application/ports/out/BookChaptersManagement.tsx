import type { BookInfo, ChapterInfo } from "../../../domain/models/arrangement";
import type { Piece } from "../../../domain/models/canvas";
import type { StackTransformer } from "../../../domain/models/pieces";

export interface BookChaptersManagementPort {
  setUpChapter(params: {
    chapter: Piece<"StackChapter">;
    book: Piece<"StackBook"> | Piece<"StackSectionBook">;
    chapterInfo: ChapterInfo;
    bookInfo: BookInfo;
    isMovable: boolean;
    biggerChapter: number;
  }): void;
  updateChaptersPosition(params: {
    book: Piece<"StackBook"> | Piece<"StackSectionBook">;
    chapters: { piece: Piece<"StackChapter">; isSelected: boolean }[];
    bibleTransformer: StackTransformer | null;
  }): void;
}
