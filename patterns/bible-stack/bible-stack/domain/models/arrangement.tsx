import type { HexString, Translatable } from "./commonTypes";
// import type { BookName } from "bibleVizUtils.domain.models.scripture";

export interface ArrangementTemplate {
  name: string;
  id: string;
  testaments: {
    name: string;
    color: HexString;
    id: string;
    sections: {
      name: string;
      color: HexString;
      id: string;
      books: {
        name: string;
        color: HexString;
        id: string;
      }[];
    }[];
  }[];
}

export interface ChapterInfo {
  readonly amountOfVerses: number;
  readonly number: number;
}

export interface BaseBookInfo {
  readonly bookId: string;
  readonly author: string;
  readonly chaptersVerseCount: readonly number[];
  readonly relativeDateRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly numberOfChapters: number;
  readonly customColor?: string;
  readonly customLabelColor?: string;
  readonly isCheckpoint?: boolean;
  readonly group?: number;
  readonly path: {
    arrangementName: string;
    testamentIndex: number;
    sectionIndex: number;
    bookIndex: number;
  };
}

export interface CompleteBookInfo extends BaseBookInfo {
  readonly type: "complete";
}

export interface SubsetBookInfo extends BaseBookInfo {
  readonly type: "subset";
  readonly completeBookId: string;
  readonly startIndex?: number;
  readonly endIndex?: number;
  readonly translationRule?: string;
}

export type BookInfo = CompleteBookInfo | SubsetBookInfo;

export interface SectionInfo extends Translatable {
  readonly name: string;
  readonly color: string;
  readonly books: readonly BookInfo[];
  readonly path: {
    arrangementName: string;
    testamentIndex: number;
    sectionIndex: number;
  };
}

export interface TestamentInfo extends Translatable {
  readonly name: string;
  readonly color?: HexString;
  readonly sections: readonly SectionInfo[];
}

export interface ArrangementInfo {
  readonly name: string;
  readonly testaments: readonly TestamentInfo[];
}

export interface TestamentPathIndices {
  arrangementIndex: number;
  testamentIndex: number;
}

export interface SectionPathIndices extends TestamentPathIndices {
  sectionIndex: number;
}

export interface BookPathIndices extends SectionPathIndices {
  bookIndex: number;
}

export type SubsetBookChapter = {
  chapter: number;
  bookId: string;
  completeBookId: string;
};

export type CompleteBookChapter = {
  chapter: number;
  bookId: string;
};
