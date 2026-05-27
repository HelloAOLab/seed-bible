import type { PieceVisibilityState } from "../models/piece";
import type { PieceKey, VerseReference } from "../models/piece";

export interface TabernacleScriptureDataPort {
  getPieceStatesForChapter(
    bookId: string,
    chapter: number
  ): Map<PieceKey, PieceVisibilityState>;
  getPiecesForVerse(bookId: string, chapter: number, verse: number): PieceKey[];
  getVersesForPiece(
    key: PieceKey,
    currentBookId: string,
    currentChapter: number
  ): { inChapter: VerseReference[]; inOtherChapters: VerseReference[] };
}
