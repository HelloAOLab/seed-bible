import type {
  HexString,
  Translatable,
} from "bibleVizUtils.domain.models.commonTypes";

export interface BookStaticInfoConfig {
  readonly author: string;
  readonly chaptersVerseCount: readonly number[];
  readonly relativeDateRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly numberOfChapters: number;
}

export interface BaseBookInfoConfig {
  readonly bookId: string;
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

export interface CompleteBookInfoConfig extends BaseBookInfoConfig {
  readonly type: "complete";
}

export interface SubsetBookInfoConfig extends BaseBookInfoConfig {
  readonly type: "subset";
  readonly completeBookId: string;
  readonly startIndex?: number;
  readonly endIndex?: number;
  readonly translationRule?: string;
}

export type BookInfoConfig = CompleteBookInfoConfig | SubsetBookInfoConfig;

export interface SectionInfoConfig extends Translatable {
  readonly name: string;
  readonly color: string;
  readonly books: readonly BookInfoConfig[];
  readonly customExplodedViewScaleFactor?: number;
  readonly customColorRange?: number;
}

export interface TestamentInfoConfig extends Translatable {
  readonly name: string;
  readonly sections: readonly SectionInfoConfig[];
  readonly color?: HexString;
}

export interface ArrangementInfoConfig {
  readonly name: string;
  readonly testaments: readonly TestamentInfoConfig[];
}
