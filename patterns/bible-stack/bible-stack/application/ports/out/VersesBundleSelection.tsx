import type { Piece } from "../../../domain/models/canvas";
import type { PaintablePieceData } from "../../../domain/models/pieces";

export interface PieceLifecycleAdapterPort {
  spawnVerseDomain(): Piece<"Verse">;
}

export interface PaintAdapterPort {
  paint: (
    piece: NonNullable<PaintablePieceData["piece"]>,
    color: string
  ) => void;
}

export interface VersesBundleSelectionAdapterPort {
  select({
    bundle,
    verseStart,
    verses,
  }: {
    bundle: Piece<"VersesBundle">;
    verseStart: number;
    verses: Piece<"Verse">[];
  }): Promise<void>;
}
