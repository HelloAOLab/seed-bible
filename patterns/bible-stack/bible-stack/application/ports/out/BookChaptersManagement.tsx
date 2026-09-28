import type { BookInfo, ChapterInfo } from "../../../domain/models/arrangement";
import type { Piece } from "../../../domain/models/canvas";
import type { StackTransformer } from "../../../domain/models/pieces";

export interface ChapterSpawnerPort {
  spawnChapterDomain(): Piece<"StackChapter">;
  despawnChapter(piece: Piece<"StackChapter">): void;
}

export interface BookChaptersManagementAdapterPort {
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
