import { type HexString } from "bibleVizUtils.functions.colors";

type GetUserPresenceBorderGradientColorsType = (params: {
  colors: HexString[];
  diffuse?: number;
}) => React.CSSProperties["backgroundImage"];

export const GetUserPresenceBorderGradientColors: GetUserPresenceBorderGradientColorsType =
  ({ colors, diffuse = 0 }) => {
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
