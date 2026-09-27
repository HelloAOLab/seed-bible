import type { Piece, PieceDataMap } from "../../../domain/models/canvas";
import type { PaintablePieceData } from "../../../domain/models/pieces";
import type { VerseData } from "../../../domain/entities/VerseData";
import type { VersesBundleData } from "../../../domain/entities/VersesBundleData";

export interface StackDataRepository {
  getPieceData: <K extends keyof PieceDataMap>(
    piece: Piece<K>
  ) => PieceDataMap[K] | undefined;
}

export interface VerseDataRepository {
  getVerseData: (piece: Piece<"Verse">) => VerseData | undefined;
}

export interface VersesBundleDataRepository {
  getBundleData: (piece: Piece<"VersesBundle">) => VersesBundleData | undefined;
}

export interface PaintAdapterPort {
  paint: (
    piece: NonNullable<PaintablePieceData["piece"]>,
    color: string
  ) => void;
  unpaint: (piece: NonNullable<PaintablePieceData["piece"]>) => void;
}
