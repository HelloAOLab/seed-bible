import type fontsData from "./fonts.json";
import {
  StackPieceMeasurements,
  type StackPieceMeasurementsType,
} from "bibleVizUtils.infrastructure.data.StackPieceMeasurements";
import {
  StackSpacings,
  type StackSpacingsType,
} from "bibleVizUtils.infrastructure.data.StackSpacings";
import {
  BibleLayoutMeasurements,
  type BibleLayoutMeasurementsType,
} from "bibleVizUtils.infrastructure.data.BibleLayoutMeasurements";
import {
  DialogBoxFormAddresses,
  type DialogBoxFormAddressesType,
} from "bibleVizUtils.infrastructure.data.DialogBoxFormAddresses";
import { StackAnimationsDuration } from "bibleVizUtils.infrastructure.data.StackAnimationsDuration";
import type {
  BookStaticInfo,
  ArrangementInfo,
} from "bibleVizUtils.infrastructure.models.arrangement";

type FontsSchema = typeof fontsData;

type FontName = keyof FontsSchema;

type FontData = FontsSchema[FontName];

interface BooksStaticInfo {
  [book: string]: BookStaticInfo;
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

  static getStackAnimationsDuration(): typeof StackAnimationsDuration {
    return StackAnimationsDuration;
  }

  static getStackAnimationDuration: <
    K extends keyof typeof StackAnimationsDuration,
  >(
    key: K
  ) => (typeof StackAnimationsDuration)[K] = (key) => {
    return this.getStackAnimationsDuration()[key];
  };
}

export { BibleVizDataRepository };
export type { BookStaticInfo, FontName, FontData };
