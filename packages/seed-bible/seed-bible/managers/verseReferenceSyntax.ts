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
 * Joins the book name to the chapter number: a space ("Gen 1"), a period
 * ("Gen.1"), or a mix ("Gen. 1").
 *
 * The colon is deliberately absent. It joins chapter to verse ("Mark 3:16"),
 * never book to chapter, so a list header like "Mark: 3 things stood out" is
 * not read as Mark chapter 3.
 */
export const BOOK_CHAPTER_JOIN_PATTERN = "[\\s.]+";

/**
 * Chapter, optional verse, optional range, with `rangeMark` between the two
 * ends of a range. `:` and `.` are interchangeable, so "3:16", "3.16",
 * "3:16-18", "3.16-18", "1:1-2:3", and "1.1-2.3" all parse.
 */
function referenceNumbers(rangeMark: string): string {
  return `(\\d+)(?:[:.](\\d+))?(?:${rangeMark}(?:(\\d+)[:.])?(\\d+))?`;
}

/**
 * Chapter/verse/range for a deliberately typed reference (playlist /
 * reading-plan input). Space around the range mark is tolerated, since a
 * spaced "Gen 1 - 3" typed into a reference field is unambiguously a range.
 * Hyphen, en dash, and em dash are all accepted as the mark.
 */
export const REFERENCE_NUMBERS_PATTERN = referenceNumbers("\\s*[-–—]\\s*");

/**
 * Chapter/verse/range in free prose (chat, footnotes, annotation bodies). The
 * range mark must be tight — "Luke 1-2", never "Luke 1 - 2" — because in prose
 * a spaced dash is usually punctuation, not a range: "Mark 4 - 3 things stood
 * out" is a sentence, not Mark 4 through 3.
 */
export const PROSE_REFERENCE_NUMBERS_PATTERN = referenceNumbers("[-–—]");

const TYPED_REFERENCE = new RegExp(
  `^(.+?)(?:${BOOK_CHAPTER_JOIN_PATTERN}${REFERENCE_NUMBERS_PATTERN})?$`
);

/**
 * A whole-string typed reference split into the book query and optional
 * chapter/verse/range groups. Used by the playlist / reading-plan editors
 * (where the chapter may still be missing while the user types).
 *
 * Supported shapes (all equivalent to Genesis 1:1 unless noted):
 *   "Gen 1:1"   space + colon
 *   "Gen 1.1"   space + period (European)
 *   "Gen.1.1"   period after the book + period
 *   "Gen. 1:1"  abbreviation period, then a normal reference
 *   "Gen.1:1"   period after the book + colon
 * Chapter-only: "Gen 1", "Gen.1"
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
 * numeric groups. Returns `null` when the string is empty, uses a colon
 * between the book and the chapter ("Gen:1"), or splits a chapter off a book
 * portion that has no letters (so "1.1" is not read as book "1", chapter 1).
 *
 * A letterless book portion with no chapter is kept: a bare "1" is someone
 * part-way through typing a numbered book like "1 John", and the editors need
 * it to keep offering suggestions.
 *
 * When no chapter has been typed yet, a trailing abbreviation period is
 * stripped so "Gen." still matches Genesis.
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
  if (!bookQuery) {
    return null;
  }

  // Only reject a letterless book portion once a chapter has been split off
  // it. "1.1" splitting into book "1" is a bare number, not a reference — but
  // "1" on its own is a numbered book still being typed ("1 John").
  if (chapterStr && !/\p{L}/u.test(bookQuery)) {
    return null;
  }

  // No book name contains a colon, so one left in the book portion means the
  // colon was being used to join book to chapter ("Gen:1", "Mark: 3 things").
  // That is not the syntax. Without this the English-name fallback in
  // getBookId() — which strips trailing punctuation so "Gen." resolves — would
  // quietly accept "Gen:" and "Mark:" as book names.
  if (bookQuery.includes(":")) {
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
