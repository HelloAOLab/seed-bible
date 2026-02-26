import type fontsData from "./fonts.json";
import {
  StackPieceMeasurements,
  type StackPieceMeasurementsType,
} from "bibleVizUtils.data.StackPieceMeasurements";
import {
  StackSpacings,
  type StackSpacingsType,
} from "bibleVizUtils.data.StackSpacings";
import {
  BibleLayoutMeasurements,
  type BibleLayoutMeasurementsType,
} from "bibleVizUtils.data.BibleLayoutMeasurements";

type FontsSchema = typeof fontsData;

type FontName = keyof FontsSchema;

type FontData = FontsSchema[FontName];

interface ChapterInfo {
  amountOfVerses: number;
  number: number;
}

interface BookStaticInfo {
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

interface BooksStaticInfo {
  [book: string]: BookStaticInfo;
}

interface BookInfo {
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
}

interface SectionInfo {
  name: string;
  color: string;
  books: BookInfo[];
  customExplodedViewScaleFactor?: number;
  customColorRange?: number;
}

interface TestamentInfo {
  name: string;
  sections: SectionInfo[];
}

interface ArrangementInfo {
  name: string;
  testaments: TestamentInfo[];
}

class BibleVizDataRepository {
  // BooksStaticInfo

  static getBooksStaticInfo(): BooksStaticInfo {
    return thisBot.tags.booksStaticInfo;
  }

  static getBookStaticInfo(book: string): BookStaticInfo | undefined {
    const booksInfo = this.getBooksStaticInfo();
    return booksInfo[book];
  }

  // Measurements

  static getBibleLayoutMeasurements(): BibleLayoutMeasurementsType {
    return BibleLayoutMeasurements;
  }

  static getBibleLayoutMeasurement: <
    K extends keyof BibleLayoutMeasurementsType,
  >(
    measurement: K
  ) => BibleLayoutMeasurementsType[K] = (measurement) => {
    const measurements = this.getBibleLayoutMeasurements();
    return measurements[measurement];
  };

  static getStackPieceMeasurements(): StackPieceMeasurementsType {
    return StackPieceMeasurements;
  }

  static getStackPieceMeasurement: <K extends keyof StackPieceMeasurementsType>(
    measurement: K
  ) => StackPieceMeasurementsType[K] = (measurement) => {
    return this.getStackPieceMeasurements()[measurement];
  };

  static getStackSpacings(): StackSpacingsType {
    return StackSpacings;
  }

  static getStackSpacing: <K extends keyof StackSpacingsType>(
    spacing: K
  ) => StackSpacingsType[K] = (spacing) => {
    return this.getStackSpacings()[spacing];
  };

  static getReadingHistoryRecencyThresholdTimeSeconds(): number {
    return thisBot.masks.readingHistoryRecencyThresholdTimeSeconds;
  }

  // Arrangement

  static getCurrentArrangementIndex(): number {
    return thisBot.vars.arrangementIndex;
  }

  static getArrangements(): ArrangementInfo[] {
    return thisBot.vars.fixedArrangementsInfo.slice();
  }

  static getArrangementByIndex: (params: {
    index: number;
  }) => ArrangementInfo | undefined = ({ index }) => {
    return this.getArrangements()[index];
  };

  static getArrangementIndexByName: (name: string) => number = (name) => {
    return this.getArrangements().findIndex((arrangementInfo) => {
      return arrangementInfo.name === name;
    });
  };

  static getCurrentArrangement(): ArrangementInfo | undefined {
    return this.getArrangements()[this.getCurrentArrangementIndex()];
  }

  static getCurrentArrangementName(): string | undefined {
    return this.getCurrentArrangement()?.name;
  }

  // Fonts

  static getFont(name: FontName): FontData {
    return thisBot.tags.fonts[name];
  }
}

export { BibleVizDataRepository };
export type {
  BookStaticInfo,
  ChapterInfo,
  BookInfo,
  SectionInfo,
  TestamentInfo,
  ArrangementInfo,
  FontName,
  FontData,
};
