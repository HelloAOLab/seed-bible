import type { BiblePieceType } from "bibleVizUtils.models.canvas";
import type { HexString } from "bibleVizUtils.models.commonTypes";

export interface HighlightData {
  color: HexString;
  typeOfPiece: BiblePieceType;
  key: string;
}
