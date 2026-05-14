import type {
  HexString,
  Translatable,
} from "bibleVizUtils.domain.models.commonTypes";
import type { BookName } from "bibleVizUtils.domain.models.scripture";

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

export interface BookInfo {
  readonly commonName: BookName;
  readonly explodedViewPosition?: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly explodedViewCustomScale?: {
    readonly x: number;
    readonly y: number;
    readonly z?: number;
  };
  readonly group?: number;
  readonly customColor?: string;
  readonly customLabelColor?: string;
  readonly isCheckpoint?: boolean;
}
export interface SectionInfo extends Translatable {
  readonly name: string;
  readonly color: string;
  readonly books: readonly BookInfo[];
  readonly customExplodedViewScaleFactor?: number;
  readonly customColorRange?: number;
}

export interface TestamentInfo extends Translatable {
  readonly name: string;
  readonly sections: readonly SectionInfo[];
  readonly color?: HexString;
}

export interface ArrangementInfo {
  readonly name: string;
  readonly testaments: readonly TestamentInfo[];
}
