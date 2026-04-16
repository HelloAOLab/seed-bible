import type {
  HexString,
  Point3D,
} from "bibleVizUtils.domain.models.commonTypes";

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
        explodedViewPosition?: Point3D;
      }[];
    }[];
  }[];
}

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

export interface BookInfo extends BookStaticInfo {
  commonName: string;
  customColor?: string;
  customLabelColor?: string;
  isCheckpoint?: boolean;
}

export interface SectionInfo {
  name: string;
  color: string;
  books: BookInfo[];
}

export interface TestamentInfo {
  name: string;
  color?: HexString;
  sections: SectionInfo[];
}

export interface ArrangementInfo {
  name: string;
  testaments: TestamentInfo[];
}
