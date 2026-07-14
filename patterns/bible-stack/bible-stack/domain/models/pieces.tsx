import type { Piece } from "./canvas";

export const HighlightRequestSources = {
  UserSelection: "UserSelection",
  UserFocus: "UserFocus",
  UserDrop: "UserDrop",
  Transition: "Transition",
  UserBlur: "UserBlur",
} as const;

export type HighlightRequestSource =
  (typeof HighlightRequestSources)[keyof typeof HighlightRequestSources];

export const UnhighlightRequestSources = {
  UserDrag: "UserDrag",
  UserFocus: "UserFocus",
  UserSelection: "UserSelection",
  UserBlur: "UserBlur",
  UserUnfocus: "UserUnfocus",
  Transition: "Transition",
} as const;

export type UnhighlightRequestSource =
  (typeof UnhighlightRequestSources)[keyof typeof UnhighlightRequestSources];

export const HighlightPacings = {
  Instant: "Instant",
  Slow: "Slow",
  Regular: "Regular",
  Fast: "Fast",
} as const;

export type HighlightPacing =
  (typeof HighlightPacings)[keyof typeof HighlightPacings];

export type StaticBiblePiece = {
  bibleId: string;
};

export type StackTransformer = Piece<"StackTransformer"> & StaticBiblePiece;

export type StackCover = Piece<"StackCover"> & StaticBiblePiece;

export type StackCrossLine = Piece<"StackCrossLine"> & StaticBiblePiece;

export type StackShadow = Piece<"StackShadow"> & StaticBiblePiece;
