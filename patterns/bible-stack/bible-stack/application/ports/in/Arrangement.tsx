import type {
  ArrangementInfo,
  BookInfo,
  BookPathIndices,
  SectionInfo,
  SectionPathIndices,
  SubsetBookInfo,
  TestamentInfo,
  TestamentPathIndices,
} from "../../../domain/models/arrangement";

export interface ArrangementServicePort {
  getArrangementByIndex(index: number): ArrangementInfo | undefined;
  getAllArrangements(): ArrangementInfo[];
  getCurrentArrangementIndex(): number;
  setCurrentArrangementIndex(index: number): boolean;
  setArrangementIndexByName(name: string): void;
  getArrangementIndexByName: (name: string) => number;
  getCurrentArrangement(): ArrangementInfo | undefined;
  getCurrentArrangementName(): string | undefined;
  addCustomArrangement(arrangement: ArrangementInfo): void;
  removeCustomArrangement(arrangement: ArrangementInfo): void;
  getBooksNamesBySectionName: (name: string) => string[] | null;
  getBookInfoPathById: (params: { id: string }) => {
    found: boolean;
    arrangementIndex: number;
    testamentIndex?: number | undefined;
    sectionIndex?: number | undefined;
    bookIndex?: number | undefined;
  };
  getBookByIndices(path: BookPathIndices): BookInfo | undefined;
  getTestamentByIndices(path: TestamentPathIndices): TestamentInfo | undefined;
  getBookSubsetByCompleteId({
    id,
    chapterNumber,
    arrangementIndex,
  }: {
    id: string;
    chapterNumber: number;
    arrangementIndex?: number | undefined;
  }): SubsetBookInfo | undefined;
  getSectionByIndices(path: SectionPathIndices): SectionInfo | undefined;
}
