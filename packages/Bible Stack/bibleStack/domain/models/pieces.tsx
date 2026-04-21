export const HighlightRequestSources = {
  UserSelection: "UserSelection",
} as const;

export type HighlightRequestSource =
  (typeof HighlightRequestSources)[keyof typeof HighlightRequestSources];
