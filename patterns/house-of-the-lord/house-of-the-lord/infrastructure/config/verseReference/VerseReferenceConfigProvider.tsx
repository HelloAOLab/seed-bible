import type { VerseReference } from "../../../domain/models/piece";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { VERSE_REFERENCE_MAP } from "./referenceMap";
import type { VerseReferenceConfigProviderPort } from "../../../application/ports/out/PieceInteraction";

export class VerseReferenceConfigProvider implements VerseReferenceConfigProviderPort {
  getPiecesForVerse<E extends ExperienceKey>({
    experienceKey,
    bookId,
    chapter,
    verse,
  }: {
    experienceKey: E;
    bookId: string;
    chapter: number;
    verse: number;
  }): ExperienceKeyMap[E][] {
    return VERSE_REFERENCE_MAP[experienceKey][bookId]?.[chapter]?.[verse] ?? [];
  }

  getVersesForPiece<E extends ExperienceKey>({
    experienceKey,
    pieceKey,
    currentBookId,
    currentChapter,
  }: {
    experienceKey: E;
    pieceKey: ExperienceKeyMap[E];
    currentBookId: string;
    currentChapter: number;
  }): { inChapter: VerseReference[]; inOtherChapters: VerseReference[] } {
    const inChapter: VerseReference[] = [];
    const inOtherChapters: VerseReference[] = [];

    for (const [bookId, chapters] of Object.entries(
      VERSE_REFERENCE_MAP[experienceKey]
    )) {
      for (const [chapterStr, verses] of Object.entries(chapters)) {
        const chapter = Number(chapterStr);
        for (const [verseStr, keys] of Object.entries(verses)) {
          if (!keys.includes(pieceKey)) continue;
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
}
