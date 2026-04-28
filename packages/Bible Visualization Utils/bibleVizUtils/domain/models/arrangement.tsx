import type { HexString } from "bibleVizUtils.domain.models.commonTypes";
import type { BookName } from "bibleVizUtils.domain.models.scripture";

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

export interface BookStaticInfo {
  readonly abbreviation: string;
  readonly author: string;
  readonly chaptersInfo: readonly ChapterInfo[];
  readonly relativeDateRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly numberOfChapters: number;
  readonly startingIndex?: number;
}

export interface BookInfo extends BookStaticInfo {
  readonly commonName: BookName;
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

export interface SectionInfo {
  readonly name: string;
  readonly color: string;
  readonly books: readonly BookInfo[];
}

export interface TestamentInfo {
  readonly name: string;
  readonly color?: HexString;
  readonly sections: readonly SectionInfo[];
}

export interface ArrangementInfo {
  readonly name: string;
  readonly testaments: readonly TestamentInfo[];
}
