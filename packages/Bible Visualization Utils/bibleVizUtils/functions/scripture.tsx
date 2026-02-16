import {
  BibleVizDataRepository,
  type BookStaticInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import {
  RgbToHex,
  type RGB,
  type HexString,
} from "bibleVizUtils.functions.colors";

type CompletePsalm = {
  chapter: number;
  book: "Psamls";
  bookId: "PSA";
};
type DividedPsalm = {
  chapter: number;
  book: string;
  bookId: string;
};
type ConvertDividedPsalmsToCompleteType = (params: {
  book: string;
  chapter: number;
}) => CompletePsalm;
type GetChildrenLevelColorsType = (params: {
  sectionColorRGB: RGB;
  colorRange: number;
  levelsLength: number;
}) => HexString[];
type ConvertCompletePsalmsToDividedType = (params: {
  chapter: number;
}) => DividedPsalm;

export const ConvertDividedPsalmsToComplete: ConvertDividedPsalmsToCompleteType =
  ({ book, chapter }) => {
    const dividedPsalmInfo = BibleVizDataRepository.getBookStaticInfo(book);

    if (dividedPsalmInfo && dividedPsalmInfo.startingIndex !== undefined) {
      return {
        chapter: chapter + dividedPsalmInfo.startingIndex,
        book: "Psamls",
        bookId: "PSA",
      };
    }

    throw new Error(
      "Divided psalm info not found at ConvertDividedPsalmsToComplete"
    );
  };

export const ConvertCompletePsalmsToDivided: ConvertCompletePsalmsToDividedType =
  ({ chapter }) => {
    const dividedPsalmsNames = [
      "1 Psalms",
      "2 Psalms",
      "3 Psalms",
      "4 Psalms",
      "5 Psalms",
    ];

    const dividedPaslmsInfo: [string, BookStaticInfo | undefined][] =
      dividedPsalmsNames.map((name) => {
        return [name, BibleVizDataRepository.getBookStaticInfo(name)];
      });

    const psalmInfo: [string, BookStaticInfo] | undefined =
      dividedPaslmsInfo.find(([, info]) => {
        if (info) {
          const { startingIndex } = info;
          if (startingIndex !== undefined) {
            return (
              startingIndex + 1 <= chapter &&
              chapter <= startingIndex + info.numberOfChapters
            );
          }
        }
        return false;
      }) as [string, BookStaticInfo] | undefined;

    if (psalmInfo) {
      const [name, info] = psalmInfo;
      return {
        book: name,
        bookId: info.abbreviation,
        chapter: chapter - (info?.startingIndex ?? 0),
      };
    }

    throw new Error("Psalm info not found at ConvertCompletePsalmsToDivided");
  };

export const GetChildrenLevelColors: GetChildrenLevelColorsType = ({
  sectionColorRGB,
  colorRange,
  levelsLength,
}) => {
  const levelsColors: HexString[] = [];
  const levelsColorRange: { min: RGB; max: RGB } = {
    min: [
      Math.max(sectionColorRGB[0] - colorRange, 0),
      Math.max(sectionColorRGB[1] - colorRange, 0),
      Math.max(sectionColorRGB[2] - colorRange, 0),
    ],
    max: [
      Math.min(sectionColorRGB[0] + colorRange, 255),
      Math.min(sectionColorRGB[1] + colorRange, 255),
      Math.min(sectionColorRGB[2] + colorRange, 255),
    ],
  };
  const deltaRed = Math.floor(
    (levelsColorRange.max[0] - levelsColorRange.min[0]) / levelsLength
  );
  const deltaGreen = Math.floor(
    (levelsColorRange.max[1] - levelsColorRange.min[1]) / levelsLength
  );
  const deltaBlue = Math.floor(
    (levelsColorRange.max[2] - levelsColorRange.min[2]) / levelsLength
  );

  for (let i = 0; i < levelsLength; i++) {
    const levelColorRGB: RGB = [
      levelsColorRange.min[0] + deltaRed * i,
      levelsColorRange.min[1] + deltaGreen * i,
      levelsColorRange.min[2] + deltaBlue * i,
    ];
    const levelColorHex: HexString = RgbToHex({ rgbColor: levelColorRGB });
    levelsColors.push(levelColorHex);
  }
  return levelsColors;
};
