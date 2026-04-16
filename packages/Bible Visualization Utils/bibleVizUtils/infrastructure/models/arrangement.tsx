import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

export interface ChapterInfo {
  amountOfVerses: number;
  number: number;
}

export interface BookStaticInfo {
  abbreviation: string;
  author: string;
  chaptersInfo: ChapterInfo[];
  relativeDateRange: {
    min: number;
    max: number;
  };
  numberOfChapters: number;
  startingIndex?: number;
}

export interface BookInfo {
  commonName: string;
  explodedViewPosition?: {
    x: number;
    y: number;
    z: number;
  };
  explodedViewCustomScale?: {
    x: number;
    y: number;
  };
  group?: number;
  customColor?: string;
  customLabelColor?: string;
  isCheckpoint?: boolean;
}
export interface SectionInfo {
  name: string;
  color: string;
  books: BookInfo[];
  customExplodedViewScaleFactor?: number;
  customColorRange?: number;
}

export interface TestamentInfo {
  name: string;
  sections: SectionInfo[];
  color?: HexString;
}

export interface ArrangementInfo {
  name: string;
  testaments: TestamentInfo[];
}
