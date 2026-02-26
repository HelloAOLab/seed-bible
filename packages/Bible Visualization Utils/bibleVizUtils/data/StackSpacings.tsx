export const StackSpacings = {
  BetweenArrangements: 2.5,
  BetweenSections: 0.5,
  BetweenBooks: 0.08,
  CoverToCross: 2,
  ExplodedViewSectionPadding: 2,
  ExplodedViewSectionShadowPadding: 1,
  SelectedBookMargin: 1,
  ChapterGap: 0.05,
  SectionShadowPadding: 1,
} as const;

export type StackSpacingsType = typeof StackSpacings;
