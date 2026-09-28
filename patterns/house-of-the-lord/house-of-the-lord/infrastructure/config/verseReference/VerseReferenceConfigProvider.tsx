import type { VerseReference } from "../../../domain/models/piece";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { VERSE_REFERENCE_MAP } from "./referenceMap";
import type { VerseReferenceConfigProviderPort } from "../../../application/ports/out/VerseReferenceConfigProvider";

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
  }: {
    experienceKey: E;
    pieceKey: ExperienceKeyMap[E];
  }): VerseReference[] {
    const references: VerseReference[] = [];

    for (const [bookId, chapters] of Object.entries(
      VERSE_REFERENCE_MAP[experienceKey]
    )) {
      for (const [chapterStr, verses] of Object.entries(chapters)) {
        const chapter = Number(chapterStr);
        for (const [verseStr, keys] of Object.entries(verses)) {
          if (!keys.includes(pieceKey)) continue;
          references.push({ bookId, chapter, verse: Number(verseStr) });
        }
      }
    }

    return references;
  }
}
