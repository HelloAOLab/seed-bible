export const ShowSequencePacings = {
  Slow: "Slow",
  Regular: "Regular",
  Fast: "Fast",
  Instant: "Instant",
} as const;
export type ShowSequencePacing = keyof typeof ShowSequencePacings;

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

export const LabelTranslucencyModes = {
  Faded: "Faded",
  Solid: "Solid",
} as const;
export type LabelTranslucencyMode =
  (typeof LabelTranslucencyModes)[keyof typeof LabelTranslucencyModes];
