// TODO: Port this hardened logic (input normalization, GetColorType validation,
// clamping) and its test suite to packages/seed-bible-utils/domain/functions/colors.tsx
// once this branch is merged. Only ClampRGBColor/HexToRgb/RgbToHex are actually used
// by this pattern; the rest are kept here solely to preserve that hardened logic +
// tests until the port. Verify the app's callers before adopting in utils — behavior
// changed (e.g. HexToRgb dropped its default, RgbToHex now clamps, several functions
// now strip spaces / lower-case their input).
import type { RGB } from "../models/commonTypes";

export type ClampRGBColorType = (colorToClamp: RGB) => RGB;
export type HexToRgbType = (params: { hexColor: string }) => RGB;
export type RgbToHexType = (params: { rgbColor: RGB }) => string;
export type ColorType = "stringRGB" | "arrayRGB" | "longHex" | "shortHex";
export type GetColorTypeType = (color: string | RGB) => ColorType | false;
export type RGBStringToArrayType = (color: string) => RGB;
export type HexLongToShortType = (hex: string) => string;
export type HexShortToLongType = (hex: string) => string;
export interface ColorParserMap {
  stringRGB: string;
  arrayRGB: RGB;
  longHex: string;
  shortHex: string;
}

export const ClampRGBColor: ClampRGBColorType = (colorToClamp) => {
  const colorClamped: RGB = [
    Math.max(Math.min(Math.round(colorToClamp[0]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[1]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[2]), 255), 0),
  ];
  return colorClamped;
};

export const HexToRgb: HexToRgbType = ({ hexColor }) => {
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

export const RgbToHex: RgbToHexType = ({ rgbColor }) => {
  const clamped = ClampRGBColor(rgbColor);
  return (
    "#" +
    ((1 << 24) + (clamped[0] << 16) + (clamped[1] << 8) + clamped[2])
      .toString(16)
      .slice(1)
  );
};

export const GetColorType: GetColorTypeType = (color) => {
  if (Array.isArray(color)) return "arrayRGB";
  const s = color.trim();
  if (/^rgba?\s*\(/.test(s)) return "stringRGB";
  const hex = (s.startsWith("#") ? s.slice(1) : s)
    .replaceAll(" ", "")
    .toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return "longHex";
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) return "shortHex";
  return false;
};

export const HexShortToLong: HexShortToLongType = (hex) => {
  const fixed = hex.replaceAll(" ", "").toLowerCase();
  const type = GetColorType(fixed);
  if (type !== "shortHex") return hex;
  const clean = fixed.startsWith("#") ? fixed.slice(1) : fixed;
  return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}` as string;
};

export const HexLongToShort: HexLongToShortType = (hex) => {
  const fixed = hex.replaceAll(" ", "").toLowerCase();
  const type = GetColorType(fixed);
  if (type !== "longHex") return hex;
  const clean = fixed.startsWith("#") ? fixed.slice(1) : fixed;
  if (clean[0] === clean[1] && clean[2] === clean[3] && clean[4] === clean[5]) {
    return `#${clean[0]}${clean[2]}${clean[4]}`;
  }
  return hex;
};

export const RGBStringToArray: RGBStringToArrayType = (color) => {
  const match = color
    .replaceAll(" ", "")
    .toLowerCase()
    .match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return [0, 0, 0];
  return ClampRGBColor([
    parseInt(match[1]!, 10),
    parseInt(match[2]!, 10),
    parseInt(match[3]!, 10),
  ]);
};

export function ColorParser<T extends ColorType>(
  value: string | RGB,
  target: T
): ColorParserMap[T] {
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
        : (value as string).replaceAll(" ", "").toLowerCase();
    rgb = HexToRgb({ hexColor: long as string });
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
}
