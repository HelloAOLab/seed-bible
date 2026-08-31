import type { ExperienceKey, ExperienceKeyMap } from "./experience";
import { VERSE_REFERENCE_MAP } from "./referenceMap";

export interface VerseCoordinate {
  bookId: string;
  chapter: number;
  verse: number;
}

/**
 * Pieces of a single experience referenced by the given verses, deduplicated and
 * in encounter order (a piece referenced by several selected verses appears once).
 */
export function getPiecesForExperience<E extends ExperienceKey>(
  experience: E,
  verses: VerseCoordinate[]
): ExperienceKeyMap[E][] {
  const experienceMap = VERSE_REFERENCE_MAP[experience];
  const pieces: ExperienceKeyMap[E][] = [];
  const seen = new Set<ExperienceKeyMap[E]>();

  for (const { bookId, chapter, verse } of verses) {
    const keys = experienceMap[bookId]?.[chapter]?.[verse] ?? [];
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      pieces.push(key);
    }
  }

  return pieces;
}

export function toPieceLabel(key: string): string {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
