export interface BookKey {
  testamentName: string;
  sectionName: string;
  bookName: string;
}

export interface ChapterKey extends BookKey {
  chapterIndex: number;
}
