export interface ChapterKey {
  testamentName: string;
  sectionName: string;
  bookName: string;
  chapterIndex: number;
}

export function areKeysEqual(keyA: ChapterKey, keyB: ChapterKey): boolean {
  return (
    keyA.testamentName === keyB.testamentName &&
    keyA.sectionName === keyB.sectionName &&
    keyA.bookName === keyB.bookName &&
    keyA.chapterIndex === keyB.chapterIndex
  );
}
