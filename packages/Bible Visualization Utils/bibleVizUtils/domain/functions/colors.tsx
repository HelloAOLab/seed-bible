import { RoundToStep } from "bibleVizUtils.domain.functions.math";
import type {
  RGB,
  HexString,
  WeightedColor,
} from "bibleVizUtils.domain.models.commonTypes";

export type ClampRGBColorType = (colorToClamp: RGB) => RGB;
export type HexToRgbType = (params: { hexColor: HexString }) => RGB;
export type RgbToHexType = (params: { rgbColor: RGB }) => HexString;
export type ColorType = "stringRGB" | "arrayRGB" | "longHex" | "shortHex";
export type GetColorTypeType = (color: string | RGB) => ColorType | false;
export type RGBStringToArrayType = (color: string) => RGB;
export type HexLongToShortType = (hex: HexString) => string;
export type HexShortToLongType = (hex: string) => HexString;
export interface ColorParserMap {
  stringRGB: string;
  arrayRGB: RGB;
  longHex: string;
  shortHex: string;
}
export type ColorParserType = <T extends ColorType>(
  value: string | RGB,
  target: T
) => ColorParserMap[T];
export type GetTextColorBasedOnBackgroundType = (params: {
  backgroundColor: WeightedColor[] | HexString;
}) => HexString;
export type GetDarkerColorType = (
  color: HexString,
  offset?: number
) => HexString;
export type GetChildrenLevelColorsType = (params: {
  sectionColorRGB: RGB;
  colorRange: number;
  levelsLength: number;
}) => HexString[];
export type ComputeConicGradientType = (
  colors: HexString[],
  offset?: number,
  diffuse?: number
) => React.CSSProperties["background"];
export type ComputeLinearGradientType = (
  colors: WeightedColor[]
) => React.CSSProperties["background"];
export type InterpolateHexColorsType = (
  baseColor: HexString,
  targetColor: HexString,
  progress: number,
  step?: number
) => HexString;
export type ComputeRawGradientColorsType = (params: {
  colors: HexString[];
  diffuse?: number;
}) => React.CSSProperties["backgroundImage"];

export const ClampRGBColor: ClampRGBColorType = (colorToClamp) => {
  const colorClamped: RGB = [
    Math.max(Math.min(Math.round(colorToClamp[0]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[1]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[2]), 255), 0),
  ];
  return colorClamped;
};

export const HexToRgb: HexToRgbType = ({ hexColor = "000000" }) => {
  const cleanHex = hexColor.trim();
  let hex = cleanHex.startsWith("#") ? cleanHex.slice(1) : cleanHex;

  if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
  }

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    console.warn(`HexToRgb: Invalid color "${hexColor}". Returning black.`);
    return [0, 0, 0];
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return [r, g, b];
};

export const RgbToHex: RgbToHexType = ({ rgbColor = [255, 255, 255] }) => {
  return (
    "#" +
    ((1 << 24) + (rgbColor[0] << 16) + (rgbColor[1] << 8) + rgbColor[2])
      .toString(16)
      .slice(1)
  );
};

export const GetColorType: GetColorTypeType = (color) => {
  if (Array.isArray(color)) return "arrayRGB";
  const s = color.trim();
  if (/^rgba?\s*\(/.test(s)) return "stringRGB";
  const hex = s.startsWith("#") ? s.slice(1) : s;
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return "longHex";
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) return "shortHex";
  return false;
};

export const HexShortToLong: HexShortToLongType = (hex) => {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}` as HexString;
};

export const HexLongToShort: HexLongToShortType = (hex) => {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (clean[0] === clean[1] && clean[2] === clean[3] && clean[4] === clean[5]) {
    return `#${clean[0]}${clean[2]}${clean[4]}`;
  }
  return hex;
};

export const RGBStringToArray: RGBStringToArrayType = (color) => {
  const match = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1]!, 10),
    parseInt(match[2]!, 10),
    parseInt(match[3]!, 10),
  ];
};

export const ColorParser: ColorParserType = <T extends ColorType>(
  value: string | RGB,
  target: T
): ColorParserMap[T] => {
  const sourceType = GetColorType(value);

  if (!sourceType || sourceType === target) return value as ColorParserMap[T];

  let rgb: RGB;
  if (sourceType === "arrayRGB") {
    rgb = value as RGB;
  } else if (sourceType === "stringRGB") {
    rgb = RGBStringToArray(value as string);
  } else {
    const long =
      sourceType === "shortHex"
        ? HexShortToLong(value as string)
        : (value as string);
    rgb = HexToRgb({ hexColor: long as HexString });
  }

  switch (target as ColorType) {
    case "arrayRGB":
      return rgb as ColorParserMap[T];
    case "stringRGB":
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)` as ColorParserMap[T];
    case "longHex":
      return RgbToHex({ rgbColor: rgb }) as ColorParserMap[T];
    case "shortHex":
      return HexLongToShort(RgbToHex({ rgbColor: rgb })) as ColorParserMap[T];
  }
};

export const GetTextColorBasedOnBackground: GetTextColorBasedOnBackgroundType =
  ({ backgroundColor }) => {
    /* For further reference visit https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio */

    const fixedBackgroundColor: WeightedColor[] = Array.isArray(backgroundColor)
      ? backgroundColor
      : [{ color: backgroundColor, value: 1 }];

    let totalWeightedLuminance = 0;
    let totalWeight = 0;

    for (const { color, value = 1 } of fixedBackgroundColor) {
      const backgroundColorRGB = HexToRgb({ hexColor: color });
      const srgb = backgroundColorRGB.map((c) => c / 255) as RGB;
      const linearRGB = srgb.map((i) =>
        i <= 0.04045 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4)
      ) as RGB;
      const relativeLuminance =
        0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];

      totalWeightedLuminance += relativeLuminance * value;
      totalWeight += value;
    }

    const averageRelativeLuminance = totalWeightedLuminance / totalWeight;

    return averageRelativeLuminance > 0.179 ? "#000000" : "#ffffff";
  };

export const GetDarkerColor: GetDarkerColorType = (color, offset = 55) => {
  const rgbColor = HexToRgb({ hexColor: color });
  const darkerColorRGB: RGB = [
    Math.max(rgbColor[0] - offset, 0),
    Math.max(rgbColor[1] - offset, 0),
    Math.max(rgbColor[2] - offset, 0),
  ];
  const darkerColorHex = RgbToHex({ rgbColor: darkerColorRGB });

  return darkerColorHex;
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

export const ComputeConicGradient: ComputeConicGradientType = (
  colors,
  offset = 45,
  diffuse = 0
) => {
  const fixedColors = [...colors, colors[0]];
  const step = 360 / colors.length;
  const gradient = `conic-gradient(from ${offset}deg, ${fixedColors
    .map((color, index) => {
      return `${color} ${Math.max(0, Math.min(360, step * index - offset + (index === 0 ? 0 : diffuse)))}deg ${Math.max(0, Math.min(360, step * (index + 1) - diffuse - offset))}deg`;
    })
    .join(", ")})`;
  return gradient;
};

export const ComputeLinearGradient: ComputeLinearGradientType = (colors) => {
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

export const InterpolateHexColors: InterpolateHexColorsType = (
  baseColor,
  targetColor,
  progress,
  step
) => {
  let finalProgress = Math.min(1, Math.max(0, progress));

  if (step) {
    finalProgress = RoundToStep(Math.max(finalProgress, step), step);
  }

  const baseColorRgb = HexToRgb({ hexColor: baseColor });
  const targetColorRgb = HexToRgb({ hexColor: targetColor });

  const colorToAdd: RGB = [
    (targetColorRgb[0] - baseColorRgb[0]) * finalProgress,
    (targetColorRgb[1] - baseColorRgb[1]) * finalProgress,
    (targetColorRgb[2] - baseColorRgb[2]) * finalProgress,
  ];

  const finalColor = ClampRGBColor([
    baseColorRgb[0] + colorToAdd[0],
    baseColorRgb[1] + colorToAdd[1],
    baseColorRgb[2] + colorToAdd[2],
  ]);

  return RgbToHex({ rgbColor: finalColor });
};

export const GetRandomColor: () => HexString = () => {
  const hexadecimalCharacters = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
  ];
  let randomColor = "#";
  for (let i = 0; i < 6; i++) {
    const randomCharacter = Math.floor(
      Math.random() * hexadecimalCharacters.length
    );
    randomColor += hexadecimalCharacters[randomCharacter];
  }
  return randomColor;
};

export const ComputeRawGradientColors: ComputeRawGradientColorsType = ({
  colors,
  diffuse = 0,
}) => {
  const fixedColors = [...colors, colors[0]];
  const step = 360 / colors.length;
  const offset = 45;
  const gradientColors = fixedColors
    .map((color, index) => {
      return `${color} ${Math.max(0, Math.min(360, step * index - offset + (index === 0 ? 0 : diffuse)))}deg ${Math.max(0, Math.min(360, step * (index + 1) - diffuse - offset))}deg`;
    })
    .join(", ");
  return gradientColors;
};
