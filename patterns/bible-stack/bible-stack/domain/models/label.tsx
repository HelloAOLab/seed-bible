export const ShowSequencePacings = {
  Slow: "Slow",
  Regular: "Regular",
  Fast: "Fast",
  Instant: "Instant",
} as const;
export type ShowSequencePacing = keyof typeof ShowSequencePacings;

export const LabelDateFormats = {
  Absolute: "Absolute",
  Relative: "Relative",
} as const;
export type LabelDateFormat =
  (typeof LabelDateFormats)[keyof typeof LabelDateFormats];

export const LabelPositions = {
  RightSided: "RightSided",
  LeftSided: "LeftSided",
  Top: "Top",
  RightSidedCorner: "RightSidedCorner",
} as const;
export type LabelPosition =
  (typeof LabelPositions)[keyof typeof LabelPositions];

export const LabelTranslucencyModes = {
  Faded: "Faded",
  Solid: "Solid",
} as const;
export type LabelTranslucencyMode =
  (typeof LabelTranslucencyModes)[keyof typeof LabelTranslucencyModes];
