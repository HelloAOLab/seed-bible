import type {
  SubsetBookInfo,
  CompleteBookChapter,
  SubsetBookChapter,
  BookInfo,
} from "../../../domain/models/arrangement";

export interface ScriptureServicePort {
  mapSubsetToCompleteBook({
    book,
    chapter,
  }: {
    book: SubsetBookInfo;
    chapter: number;
  }): CompleteBookChapter;
  mapCompleteToSubsetBook({
    chapter,
    subsets,
  }: {
    chapter: number;
    subsets: readonly SubsetBookInfo[];
  }): SubsetBookChapter;
  getBiggerChapter: () => number;
  getSectionChapterCount: (section: readonly BookInfo[]) => number;
  getBookChapterCount(bookId: string): number;
}
