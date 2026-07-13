import type {
  ArrangementInfo,
  BookInfo,
  BookPathIndices,
} from "../../../domain/models/arrangement";

export interface BookInfoPathGetter {
  getBookInfoPathById: (params: { id: string }) => {
    found: boolean;
    testamentIndex?: number | undefined;
    sectionIndex?: number | undefined;
    bookIndex?: number | undefined;
  };
}

export interface BookInfoGetter {
  getBookByIndices(path: BookPathIndices): BookInfo | undefined;
}

export interface ArrangementProvider {
  getCurrentArrangementIndex(): number;
  getArrangementByIndex(index: number): ArrangementInfo | undefined;
}
