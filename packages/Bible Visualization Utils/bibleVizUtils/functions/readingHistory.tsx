import { RoundToStep } from "bibleVizUtils.functions.math";
import {
  ClampRGBColor,
  HexToRgb,
  RgbToHex,
  type RGB,
  type HexString,
  type WeightedColor,
} from "bibleVizUtils.functions.colors";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

const defaultColor = "#000000";
type GetHistoryColorByReadingTimeType = (params: {
  baseColor?: HexString;
  readingTimeSeconds: number;
  fullColorTimeSeconds?: number;
  step?: number;
  stepColors?: HexString[];
  userColor?: HexString;
}) => HexString;
type GetHistoryColorByRecencyType = (params: {
  recencyTimeSeconds: number;
  baseColor?: HexString;
  userColor?: HexString;
  step?: number | undefined;
}) => HexString;
type GetHistoryColorLinearGradientType = (
  colors: WeightedColor[]
) => React.CSSProperties["background"];

export const GetHistoryColorByReadingTime: GetHistoryColorByReadingTimeType = ({
  baseColor = defaultColor,
  readingTimeSeconds,
  fullColorTimeSeconds = 900, // 15 minutes default
  step,
  stepColors,
  userColor = defaultColor,
}) => {
  let progress = Math.min(1, readingTimeSeconds / fullColorTimeSeconds);

  if (step) {
    progress = RoundToStep(Math.max(progress, step), step);
    if (stepColors) {
      const index = progress / step;
      return stepColors[index] ?? defaultColor;
    }
  }

  const baseColorRgb = HexToRgb({ hexColor: baseColor });
  const userColorRgb = HexToRgb({ hexColor: userColor });

  const difference: RGB = [
    userColorRgb[0] - baseColorRgb[0],
    userColorRgb[1] - baseColorRgb[1],
    userColorRgb[2] - baseColorRgb[2],
  ];

  const colorToAdd: RGB = [
    difference[0] * progress,
    difference[1] * progress,
    difference[2] * progress,
  ];

  const finalColor = ClampRGBColor([
    baseColorRgb[0] + colorToAdd[0],
    baseColorRgb[1] + colorToAdd[1],
    baseColorRgb[2] + colorToAdd[2],
  ]);

  const finalColorHex = RgbToHex({ rgbColor: finalColor });

  return finalColorHex;
};

export const GetHistoryColorByRecency: GetHistoryColorByRecencyType = ({
  recencyTimeSeconds,
  baseColor = defaultColor,
  userColor = defaultColor,
  step,
}) => {
  const recencyThresholdTimeSeconds =
    BibleVizDataRepository.getReadingHistoryRecencyThresholdTimeSeconds();
  const now = new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const secPerDay = 60 * 60 * 24;
  const defaultStep =
    1 / Math.floor((nowSeconds - recencyThresholdTimeSeconds) / secPerDay);
  if (!step) step = defaultStep;

  const timeFrameSeconds = nowSeconds - recencyThresholdTimeSeconds;
  const elapsedRecencySeconds = Math.max(
    recencyTimeSeconds - recencyThresholdTimeSeconds,
    0
  );

  let progress = Math.min(elapsedRecencySeconds / timeFrameSeconds, 1);

  if (step) {
    progress = RoundToStep(Math.max(progress, step), step);
  }

  const baseColorRgb = HexToRgb({ hexColor: baseColor });
  const userColorRgb = HexToRgb({ hexColor: userColor });

  const deltaColor: RGB = [
    userColorRgb[0] - baseColorRgb[0],
    userColorRgb[1] - baseColorRgb[1],
    userColorRgb[2] - baseColorRgb[2],
  ];
  const colorToAdd: RGB = [
    deltaColor[0] * progress,
    deltaColor[1] * progress,
    deltaColor[2] * progress,
  ];
  const finalColor = ClampRGBColor([
    baseColorRgb[0] + colorToAdd[0],
    baseColorRgb[1] + colorToAdd[1],
    baseColorRgb[2] + colorToAdd[2],
  ]);
  const finalColorHex = RgbToHex({ rgbColor: finalColor });

  return finalColorHex;
};

export const GetHistoryColorLinearGradient: GetHistoryColorLinearGradientType =
  (colors) => {
    let accumulated = 0;
    const gradient = `linear-gradient(0deg, ${colors
      .map(({ color, value = 1 }) => {
        const result = `${color} ${Math.min(100, Math.max(0, Math.round(accumulated * 100)))}%, ${color} ${Math.min(100, Math.max(0, Math.round((accumulated + value) * 100)))}%`;
        accumulated += value;
        return result;
      })
      .join(", ")})`;

    return gradient;
  };
