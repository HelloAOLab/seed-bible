import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

export const HighlightRequestSources = {
  UserSelection: "UserSelection",
  UserFocus: "UserFocus",
  UserDrop: "UserDrop",
  Transition: "Transition",
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

export type StaticBiblePiece = {
  bibleId: string;
};

export type StackTransformer = Piece<"StackTransformer"> & StaticBiblePiece;

export type StackCover = Piece<"StackCover"> & StaticBiblePiece;

export type StackCrossLine = Piece<"StackCrossLine"> & StaticBiblePiece;

export type StackShadow = Piece<"StackShadow"> & StaticBiblePiece;
