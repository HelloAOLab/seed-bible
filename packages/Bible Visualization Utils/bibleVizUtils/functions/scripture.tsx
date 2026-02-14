import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
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
type ConvertDividedPsalmsToCompleteType = (params: {
  book: string;
  chapter: number;
}) => CompletePsalm;
type GetChildrenLevelColorsType = (params: {
  sectionColorRGB: RGB;
  colorRange: number;
  levelsLength: number;
}) => HexString[];

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
