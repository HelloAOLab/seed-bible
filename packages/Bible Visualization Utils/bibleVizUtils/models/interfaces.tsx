import type { BiblePieceTypeType } from "bibleVizUtils.models.enums";

export interface TabData {
  use: string;
  first: boolean;
  type: string;
  book: string;
  bookId: string;
  chapter: number;
  translation: string;
  shortName: string;
}

export interface Tab {
  id: string;
  taken: boolean;
  data: TabData;
}

export interface PieceInfo {
  typeOfPiece: BiblePieceTypeType;
  key: string;
}
