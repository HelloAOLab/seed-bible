import type {
  ArrangementInfo,
  BookInfo,
  BookPathIndices,
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
}
