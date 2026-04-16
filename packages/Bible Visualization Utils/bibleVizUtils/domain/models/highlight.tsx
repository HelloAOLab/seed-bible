import type { BiblePieceType } from "bibleVizUtils.domain.models.canvas";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

export interface HighlightData {
  color: HexString;
  typeOfPiece: BiblePieceType;
  key: string;
}
