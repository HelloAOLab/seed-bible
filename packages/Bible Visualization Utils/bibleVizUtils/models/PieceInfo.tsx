import type { PieceInfo as IPeaceInfo } from "bibleVizUtils.models.interfaces";
import type { BiblePieceTypeType } from "bibleVizUtils.models.enums";

export class PieceInfo implements IPeaceInfo {
  typeOfPiece: BiblePieceTypeType;
  key: string;

  constructor({
    typeOfPiece,
    key,
  }: {
    typeOfPiece: BiblePieceTypeType;
    key: string;
  }) {
    this.typeOfPiece = typeOfPiece;
    this.key = key;
  }
}
