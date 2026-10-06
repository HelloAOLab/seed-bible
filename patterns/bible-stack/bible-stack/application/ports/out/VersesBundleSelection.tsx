import type { Piece } from "../../../domain/models/canvas";

export interface VersesBundleSelectionPort {
  select(params: {
    bundle: Piece<"VersesBundle">;
    verseStart: number;
    verses: Piece<"Verse">[];
  }): Promise<void>;
}
