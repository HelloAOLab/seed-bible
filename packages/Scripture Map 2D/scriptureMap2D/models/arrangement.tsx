import type { BookName } from "bibleVizUtils.domain.models.scripture";

export interface BookKey {
  testamentName: string;
  sectionName: string;
  bookName: BookName;
}

export interface ChapterKey extends BookKey {
  chapterIndex: number;
}
