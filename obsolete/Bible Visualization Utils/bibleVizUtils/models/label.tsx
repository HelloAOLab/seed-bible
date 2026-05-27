export const LabelDateFormat = {
  Absolute: "Absolute",
  Relative: "Relative",
} as const;
export type LabelDateFormatType =
  (typeof LabelDateFormat)[keyof typeof LabelDateFormat];

export const LabelPosition = {
  RightSided: "RightSided",
  LeftSided: "LeftSided",
  Top: "Top",
  RightSidedCorner: "RightSidedCorner",
} as const;
export type LabelPositionType =
  (typeof LabelPosition)[keyof typeof LabelPosition];
