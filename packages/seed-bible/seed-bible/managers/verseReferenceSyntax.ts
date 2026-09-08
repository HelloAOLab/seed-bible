/**
 * The trailing verse/range portion of a reference, shared by every candidate
 * book. `verse`/`endVerse`/`endChapter` mirror the same fields on a parsed
 * verse reference.
 */
export type ReferenceTail = {
  verse?: number;
  endVerse?: number;
  endChapter?: number;
};

/**
 * Joins the book name to the chapter number: a space ("Gen 1:1"), a period
 * ("Gen.1.1"), or both ("Gen. 1:1").
 */
export const BOOK_CHAPTER_JOIN_PATTERN = "[\\s.]+";

/**
 * Chapter, optional verse, optional range. `:` and `.` are interchangeable, so
 * "3:16", "3.16", "3:16-18", "3.16-18", "1:1-2:3", and "1.1-2.3" all parse.
 * Hyphen, en dash, and em dash are accepted as the range mark.
 */
export const REFERENCE_NUMBERS_PATTERN =
  "(\\d+)(?:[:.](\\d+))?(?:\\s*[-–—]\\s*(?:(\\d+)[:.])?(\\d+))?";

const TYPED_REFERENCE = new RegExp(
  `^(.+?)(?:${BOOK_CHAPTER_JOIN_PATTERN}${REFERENCE_NUMBERS_PATTERN})?$`
);

/**
 * A whole-string typed reference split into the book query and optional
 * chapter/verse/range groups. Used by the playlist / reading-plan editors
 * (where the chapter may still be missing while the user types).
 *
 * Supported shapes (all equivalent to Genesis 1:1):
 *   "Gen 1:1"   space + colon
 *   "Gen 1.1"   space + period (European)
 *   "Gen.1.1"   period after the book + period
 *   "Gen. 1:1"  abbreviation period, then a normal reference
 *   "Gen.1:1"   period after the book + colon
 */
export type SplitTypedReference = {
  bookQuery: string;
  chapterStr?: string;
  verseStr?: string;
  endChapterStr?: string;
  endVerseStr?: string;
};

/**
 * Splits a human-typed scripture reference into the book portion and the
 * numeric groups. Returns `null` when the string is empty or has no letters
 * in the book portion (so a bare "1.1" is not treated as a numbered book).
 *
 * When no chapter has been typed yet, a trailing period is stripped so an
 * abbreviation like "Gen." still matches Genesis.
 */
export function splitTypedVerseReference(
  input: string
): SplitTypedReference | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(TYPED_REFERENCE);
  if (!match?.[1]) {
    return null;
  }

  const chapterStr = match[2];
  const bookQuery = chapterStr ? match[1] : match[1].replace(/[.\s]+$/u, "");
  if (!bookQuery || !/\p{L}/u.test(bookQuery)) {
    return null;
  }

  return {
    bookQuery,
    chapterStr,
    verseStr: match[3],
    endChapterStr: match[4],
    endVerseStr: match[5],
  };
}

/**
 * Builds the verse/range portion of a reference from the parsed number groups,
 * or returns `null` when the format is invalid (a whole-chapter start mixed
 * with a verse end, e.g. "John 1-2:3").
 */
export function buildTail(
  verseStr: string | undefined,
  endChapterStr: string | undefined,
  endVerseStr: string | undefined
): ReferenceTail | null {
  const tail: ReferenceTail = {};
  if (verseStr) {
    // Verse-based reference: "John 3:16", "John 3:16-18", "Genesis 1:1-2:3".
    tail.verse = Number(verseStr);
    if (endVerseStr) {
      tail.endVerse = Number(endVerseStr);
    }
    if (endChapterStr) {
      tail.endChapter = Number(endChapterStr);
    }
  } else if (endVerseStr) {
    // Whole-chapter range: "John 1-3". Without a start verse the trailing number
    // is an end chapter, not an end verse. A colon there (e.g. "John 1-2:3")
    // would mix a chapter start with a verse end, so reject that ambiguity.
    if (endChapterStr) {
      return null;
    }
    tail.endChapter = Number(endVerseStr);
  }
  return tail;
}
