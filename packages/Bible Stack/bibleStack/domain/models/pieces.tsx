export const HighlightRequestSources = {
  UserSelection: "UserSelection",
  UserFocus: "UserFocus",
  UserDrop: "UserDrop",
} as const;

export type HighlightRequestSource =
  (typeof HighlightRequestSources)[keyof typeof HighlightRequestSources];

export const UnhighlightRequestSources = {
  UserDrag: "UserDrag",
  UserFocus: "UserFocus",
  UserUnfocus: "UserUnfocus",
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
