export interface BookKey {
  testamentName: string;
  sectionName: string;
  bookId: string;
}

export interface ChapterKey extends BookKey {
  chapterIndex: number;
}
