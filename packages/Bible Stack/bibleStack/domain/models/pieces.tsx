export const HighlightRequestSources = {
  UserSelection: "UserSelection",
} as const;

export type HighlightRequestSource =
  (typeof HighlightRequestSources)[keyof typeof HighlightRequestSources];

export const UnhighlightRequestSources = {
  UserDrag: "UserDrag",
} as const;

export type UnhighlightRequestSource =
  (typeof UnhighlightRequestSources)[keyof typeof UnhighlightRequestSources];

export const UnhighlightPacings = {
  Instant: "Instant",
  Slow: "Slow",
  Regular: "Regular",
  Fast: "Fast",
} as const;

export type UnhighlightPacing =
  (typeof UnhighlightPacings)[keyof typeof UnhighlightPacings];
