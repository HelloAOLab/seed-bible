export const StackPieceMeasurements = {
  ChapterWidth: 0.5,
  ChapterHeight: 0.5,
  MinChapterBackDepth: 0.5,
  ChapterFrontDepth: 0.01,
  ChapterFrontSelectedDepth: 0.25,
  EmptySectionShadowScaleZ: 1,
  CoverScales: new Vector3(2.53, 3.85, 0.1),
  TestamentScales: new Vector3(2.27, 3.47, 0.825),
  SectionScales: new Vector2(2.04, 3.12),
  BookScales: new Vector2(1.83, 2.8),
  SectionAditionalScaleOnHover: 0.1,
  SectionDesiredScaleZRatio: 0.02,
  AditionalBookScaleOnHover: 0.1,
} as const;

export type StackPieceMeasurementsType = typeof StackPieceMeasurements;
