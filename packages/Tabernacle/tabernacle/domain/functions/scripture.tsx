import type { MeshState } from "tabernacle.domain.models.meshState";
import { MeshStates } from "tabernacle.domain.models.meshState";
import type {
  PieceChapterConfig,
  ScriptureVersesMap,
} from "tabernacle.domain.models.scripture";
import type { PieceKey, VerseReference } from "tabernacle.domain.models.piece";

const TABERNACLE_BOOK_ID = "EXO";
// Chapters where at least one piece is visible (derived from chaptersInfo data).
const TABERNACLE_CHAPTERS = new Set([
  25, 26, 27, 28, 29, 30, 36, 37, 38, 39, 40,
]);

export function getPieceStatesForChapter(
  pieceConfigs: PieceChapterConfig[],
  bookId: string,
  chapter: number
): Map<PieceKey, MeshState> {
  const result = new Map<PieceKey, MeshState>();
  const isTabernacleChapter =
    bookId === TABERNACLE_BOOK_ID && TABERNACLE_CHAPTERS.has(chapter);

  for (const config of pieceConfigs) {
    if (!isTabernacleChapter) {
      result.set(config.key, MeshStates.Hidden);
      continue;
    }
    const chapterStr = String(chapter);
    const state = config.chaptersInfo[chapterStr] ?? MeshStates.Hidden;
    result.set(config.key, state);
  }

  return result;
}

export function getPiecesForVerse(
  scriptureData: ScriptureVersesMap,
  bookId: string,
  chapter: number,
  verse: number
): PieceKey[] {
  const rawKeys =
    scriptureData[bookId]?.[String(chapter)]?.[String(verse)] ?? [];
  return rawKeys.filter((k) => k !== "tabernacle") as PieceKey[];
}

export function getVersesForPiece(
  scriptureData: ScriptureVersesMap,
  key: PieceKey,
  currentBookId: string,
  currentChapter: number
): { inChapter: VerseReference[]; inOtherChapters: VerseReference[] } {
  const inChapter: VerseReference[] = [];
  const inOtherChapters: VerseReference[] = [];

  for (const bookId in scriptureData) {
    const chapters = scriptureData[bookId]!;
    for (const chapterStr in chapters) {
      const verses = chapters[chapterStr]!;
      const chapter = Number(chapterStr);
      for (const verseStr in verses) {
        const keys = verses[verseStr]!;
        if (!keys.includes(key)) continue;
        const verse = Number(verseStr);
        const ref: VerseReference = { bookId, chapter, verse };
        if (bookId === currentBookId && chapter === currentChapter) {
          inChapter.push(ref);
        } else {
          inOtherChapters.push(ref);
        }
      }
    }
  }

  return { inChapter, inOtherChapters };
}
