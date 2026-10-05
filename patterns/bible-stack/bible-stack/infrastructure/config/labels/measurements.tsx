export const MEASUREMENTS = {
  ScaleXLimit: 5,
  PaddingX: 0.4,
  PaddingY: 0.4,
  TextScaleZ: 1,
  TransformerDesiredScaleX: 1,
  TransformerDesiredScaleY: 1,
  TransformerDesiredScaleZ: 1,
  TailDesiredScaleX: 0.3,
  TailDesiredScaleY: 0.3,
  TailDesiredScaleZ: 0.3,
  TextOffsetMargin: 0.25,
  DateGapX: 0.2,
  DateGapY: 0.05,
  DateDesiredScaleY: 0.375,
  TransformeOffsetX: 0,
  TransformeOffsetY: 0,
  TransformeOffsetZ: 1,
} as const;

export type MeasurementsType = typeof MEASUREMENTS;
