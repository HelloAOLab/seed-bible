import type { ExperienceKey, ExperienceKeyMap } from "./experience";
import { VERSE_REFERENCE_MAP } from "./referenceMap";

export interface VerseCoordinate {
  bookId: string;
  chapter: number;
  verse: number;
}

function uniqueInOrder<T>(lists: Iterable<T[]>): T[] {
  const pieces: T[] = [];
  const seen = new Set<T>();

  for (const keys of lists) {
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      pieces.push(key);
    }
  }

  return pieces;
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

  return uniqueInOrder(
    verses.map(
      ({ bookId, chapter, verse }) =>
        experienceMap[bookId]?.[chapter]?.[verse] ?? []
    )
  );
}

/**
 * Pieces of a single experience referenced anywhere in the given chapter,
 * deduplicated and in verse order.
 */
export function getPiecesForChapter<E extends ExperienceKey>(
  experience: E,
  bookId: string,
  chapter: number
): ExperienceKeyMap[E][] {
  const chapterMap = VERSE_REFERENCE_MAP[experience][bookId]?.[chapter];
  if (!chapterMap) return [];

  return uniqueInOrder(Object.values(chapterMap));
}

export function toPieceLabel(key: string): string {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
