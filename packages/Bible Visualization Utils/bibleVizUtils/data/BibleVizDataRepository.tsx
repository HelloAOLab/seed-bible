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

interface BibleLayoutMeasurements {
  Book2DMaxColumns: number;
  Book3DMaxAmountOfColumns: number;
  Book3DScaleX: number;
  BookHorizontalGap: number;
  BookHorizontalOffset: number;
  BookLabelHeight: number;
  BookPositionZ: number;
  BookVerticalGap: number;
  Chapter3DGap: number;
  Chapter3DHeight: number;
  Chapter3DPadding: number;
  Chapter3DWidth: number;
  ChapterInitialScaleZ: number;
  ChapterPlaylistItemDeltaHeight: number;
  ChapterSelectedScaleZ: number;
  GapBetweenBookAndLine: number;
  LayersVerticalGap: number[];
  MaxAmountOfColumns: number;
  PlaylistEntryItemPadding: number;
  PlaylistNavigationButtonVerticalGap: number;
  PlaylistStackedEntryItemGap: number;
}

type BibleLayoutMeasurement = keyof BibleLayoutMeasurements;

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

  // BibleLayoutMeasurements

  static getBibleLayoutMeasurements(): BibleLayoutMeasurements {
    return thisBot.tags.BibleLayoutMeasurements;
  }

  static getBibleLayoutMeasurement(
    measurement: BibleLayoutMeasurement
  ): number | number[] {
    const measurements = this.getBibleLayoutMeasurements();
    return measurements[measurement];
  }

  static getReadingHistoryRecencyThresholdTimeSeconds(): number {
    return thisBot.masks.readingHistoryRecencyThresholdTimeSeconds;
  }
}

export { BibleVizDataRepository };
export type {
  BookStaticInfo,
  BookInfo,
  SectionInfo,
  TestamentInfo,
  ArrangementInfo,
  BibleLayoutMeasurement,
  BibleLayoutMeasurements,
};
