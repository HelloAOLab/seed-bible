export type RGB = [number, number, number];
type HexWithHash = `#${string}`;
export type HexString = HexWithHash | string;

export type WeightedColor = { color: HexString; value?: number };

type ClampRGBColorType = (colorToClamp: RGB) => RGB;
type HexToRgbType = (params: { hexColor: HexString }) => RGB;
type RgbToHexType = (params: { rgbColor: RGB }) => HexString;
type GetTextColorBasedOnBackgroundType = (params: {
  backgroundColor: WeightedColor[] | HexString;
}) => HexString;

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
  const hex = cleanHex.startsWith("#") ? cleanHex.slice(1) : cleanHex;

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
