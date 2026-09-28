import type { VerseReference } from "../models/piece";
import type { VerseRange } from "../models/scripture";

export function ToVerseRanges(references: VerseReference[]): VerseRange[] {
  const ranges: VerseRange[] = [];

  for (const reference of references) {
    const last = ranges[ranges.length - 1];
    if (
      last &&
      last.bookId === reference.bookId &&
      last.chapter === reference.chapter &&
      reference.verse === last.end + 1
    ) {
      last.end = reference.verse;
      continue;
    }
    ranges.push({
      bookId: reference.bookId,
      chapter: reference.chapter,
      start: reference.verse,
      end: reference.verse,
    });
  }

  return ranges;
}

export function FormatVerseRange(range: VerseRange, bookName: string): string {
  const verses =
    range.start === range.end
      ? `${range.start}`
      : `${range.start}–${range.end}`;
  return `${bookName} ${range.chapter}:${verses}`;
}
