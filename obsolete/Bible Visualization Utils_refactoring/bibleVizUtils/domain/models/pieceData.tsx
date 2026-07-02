import { type Piece, BiblePiece } from "bibleVizUtils.domain.models.canvas";
import type { LayoutBookData } from "bibleVizUtils.domain.entities.LayoutBookData";
import type { LayoutChapterData } from "bibleVizUtils.domain.entities.LayoutChapterData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";

export interface PieceDataMap {
  [BiblePiece.LayoutBook]: LayoutBookData;
  [BiblePiece.LayoutChapter]: LayoutChapterData;
  [BiblePiece.StackBook]: StackBookData;
  [BiblePiece.StackChapter]: StackChapterData;
  [BiblePiece.StackSection]: StackSectionData;
  [BiblePiece.StackSectionBook]: StackSectionBookData;
  [BiblePiece.StackTestament]: StackTestamentData;
  [BiblePiece.StackSectionShadow]: StackSectionData;
}

export interface GetPieceDataParams<T> {
  pieceType: T;
  pieceId: Piece["id"];
}

export type GetPieceData = <T extends keyof PieceDataMap>(
  params: GetPieceDataParams<T>
) => PieceDataMap[T];

export type GetAllPiecesDataByType = <T extends keyof PieceDataMap>(
  type: T
) => PieceDataMap[T][];
