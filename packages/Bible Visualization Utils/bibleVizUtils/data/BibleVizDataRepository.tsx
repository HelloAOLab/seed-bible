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
import {
  DialogBoxFormAddresses,
  type DialogBoxFormAddressesType,
} from "bibleVizUtils.data.DialogBoxFormAddresses";
import type { HexString } from "bibleVizUtils.models.commonTypes";

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
  customLabelColor?: string;
  isCheckpoint?: boolean;
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
  color?: HexString;
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

  static getStaticArrangements(): ArrangementInfo[] {
    return thisBot.tags.arrangementsInfo.slice();
  }

  static getCustomArrangements(): ArrangementInfo[] {
    if (!thisBot.vars.customArrangements) {
      thisBot.vars.customArrangements = [];
    }
    return thisBot.vars.customArrangements.slice();
  }

  static setCustomArrangements(arrangements: ArrangementInfo[]): void {
    thisBot.vars.customArrangements = arrangements;
  }

  // Fonts

  static getFont(name: FontName): FontData {
    return thisBot.tags.fonts[name];
  }

  static getDialogBoxFormAddresses(): DialogBoxFormAddressesType {
    return DialogBoxFormAddresses;
  }

  static getDialogBoxFormAddress<K extends keyof DialogBoxFormAddressesType>(
    key: K
  ): DialogBoxFormAddressesType[K] {
    return this.getDialogBoxFormAddresses()[key];
  }

  static getDialogBoxAspectRatios(): Array<keyof DialogBoxFormAddressesType> {
    return Object.keys(DialogBoxFormAddresses).map(Number) as Array<
      keyof DialogBoxFormAddressesType
    >;
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
