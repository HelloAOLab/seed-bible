import type { BiblePieceType } from "bibleVizUtils.models.canvas.models";
import type { HexString } from "bibleVizUtils.models.common.types";

export interface HighlightData {
  color: HexString;
  typeOfPiece: BiblePieceType;
  key: string;
}
