import type { Piece } from "bibleVizUtils.domain.models.canvas";

export type StaticBiblePiece = {
  bibleId: string;
};

export type StackTransformer = Piece<"StackTransformer"> & StaticBiblePiece;

export type StackCover = Piece<"StackCover"> & StaticBiblePiece;

export type StackCrossLine = Piece<"StackCrossLine"> & StaticBiblePiece;

export type StackShadow = Piece<"StackShadow"> & StaticBiblePiece;
