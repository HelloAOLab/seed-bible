import {
  BOOK_CHAPTER_VERSE_COUNTS,
  getBookChapterCount,
  getChapterVerseCount,
} from "../bookChapterVerseCounts";
import { resolveLinkMedia } from "../resolveLinkMedia";
import {
  contentChapterKey,
  type ContentChapterEntry,
  type ContentChapterRecord,
  type ContentItem,
  type ContentReference,
} from "./schema";

/** Chapter entries carry a short description; the item keeps the full one. */
export const CHAPTER_ENTRY_DESCRIPTION_LENGTH = 300;

/** One chapter a reference touches. `verses` empty means the whole chapter. */
export interface ChapterSlice {
  book: string;
  chapter: number;
  verses: number[];
}

function range(from: number, to: number): number[] {
  const verses: number[] = [];
  for (let verse = from; verse <= to; verse++) {
    verses.push(verse);
  }
  return verses;
}

/**
 * Splits a reference into the chapters it touches. A range across chapters
 * (Acts 1:13–2:4) covers the rest of its first chapter, every chapter in
 * between, and the start of its last one.
 */
export function sliceReferenceByChapter(
  reference: Pick<
    ContentReference,
    "book" | "chapter" | "endChapter" | "verse" | "endVerse"
  >
): ChapterSlice[] {
  const { book, chapter, verse, endVerse } = reference;
  const lastChapterInBook = getBookChapterCount(book);
  let endChapter = Math.max(reference.endChapter ?? chapter, chapter);
  if (lastChapterInBook !== undefined) {
    endChapter = Math.min(endChapter, lastChapterInBook);
  }

  if (endChapter === chapter) {
    if (verse === undefined) {
      return [{ book, chapter, verses: [] }];
    }
    return [
      {
        book,
        chapter,
        verses: range(verse, Math.max(endVerse ?? verse, verse)),
      },
    ];
  }

  const slices: ChapterSlice[] = [];
  for (let current = chapter; current <= endChapter; current++) {
    let verses: number[] = [];
    if (current === chapter && verse !== undefined) {
      const lastVerse = getChapterVerseCount(book, current);
      // Without a verse count, the rest of the chapter can't be listed, so
      // the item is shown for the whole chapter rather than for none of it.
      verses = lastVerse === undefined ? [] : range(verse, lastVerse);
    } else if (current === endChapter && endVerse !== undefined) {
      verses = range(1, endVerse);
    }
    slices.push({ book, chapter: current, verses });
  }
  return slices;
}

/** Combines two verse lists for one chapter; a whole-chapter list wins. */
function mergeVerses(a: number[], b: number[]): number[] {
  if (a.length === 0 || b.length === 0) {
    return [];
  }
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

/** Every chapter a published item appears on, keyed like `"JHN.3"`. */
export function publishedChapterKeys(
  item: ContentItem | undefined
): Set<string> {
  const keys = new Set<string>();
  if (!item || item.status !== "published") {
    return keys;
  }
  for (const reference of item.references) {
    for (const slice of sliceReferenceByChapter(reference)) {
      keys.add(contentChapterKey(slice.book, slice.chapter));
    }
  }
  return keys;
}

/**
 * The chapters whose records must be rebuilt after an item changes: the
 * ones it was on before as well as the ones it's on now, so moving an item
 * from John 3 to John 4 also takes it off John 3.
 */
export function affectedChapterKeys(
  before: ContentItem | undefined,
  after: ContentItem | undefined
): Set<string> {
  return new Set([
    ...publishedChapterKeys(before),
    ...publishedChapterKeys(after),
  ]);
}

function trimDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= CHAPTER_ENTRY_DESCRIPTION_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, CHAPTER_ENTRY_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

/** The verses of one chapter an item covers, or null when it isn't on it. */
function versesInChapter(
  item: ContentItem,
  book: string,
  chapter: number
): number[] | null {
  let verses: number[] | null = null;
  for (const reference of item.references) {
    for (const slice of sliceReferenceByChapter(reference)) {
      if (slice.book === book && slice.chapter === chapter) {
        verses =
          verses === null ? slice.verses : mergeVerses(verses, slice.verses);
      }
    }
  }
  return verses;
}

/**
 * The chapter record for one chapter, built from every published item. An
 * item with several references in the chapter gets one entry covering all
 * of them. Returns null when nothing is published there, meaning the
 * record should be erased.
 */
export function buildChapterRecord(
  items: readonly ContentItem[],
  book: string,
  chapter: number,
  now: number
): ContentChapterRecord | null {
  const entries: ContentChapterEntry[] = [];
  for (const item of items) {
    if (item.status !== "published") {
      continue;
    }
    const verses = versesInChapter(item, book, chapter);
    if (verses === null) {
      continue;
    }
    entries.push({
      itemId: item.id,
      url: item.url,
      ...(item.mediaUrl ? { mediaUrl: item.mediaUrl } : {}),
      mediaKind: resolveLinkMedia(item.mediaUrl ?? item.url).kind,
      title: item.title,
      description: trimDescription(item.description),
      ...(item.image ? { image: item.image } : {}),
      ...(item.author ? { author: item.author } : {}),
      categoryIds: item.categoryIds,
      verses,
      reference:
        verses.length === 0
          ? { book, chapter }
          : verses.length === 1
            ? { book, chapter, verse: verses[0]! }
            : {
                book,
                chapter,
                verse: verses[0]!,
                endVerse: verses[verses.length - 1]!,
              },
    });
  }
  if (entries.length === 0) {
    return null;
  }
  // Whole-chapter items first, then by where in the chapter they start.
  entries.sort(
    (a, b) =>
      (a.verses[0] ?? 0) - (b.verses[0] ?? 0) || a.title.localeCompare(b.title)
  );
  return { schemaVersion: 1, book, chapter, updatedAt: now, entries };
}

/**
 * Most bytes one chapter page may take. CasualOS refuses data entries over
 * the owner's plan limit (500 KB unless configured otherwise), so pages stay
 * well below it.
 */
export const CHAPTER_PAGE_BYTES = 200_000;

const encoder = new TextEncoder();

function byteLength(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).length;
}

/**
 * Splits a chapter record into pages of at most `maxBytes` each, keeping
 * the entries' order. Almost every chapter fits in one.
 */
export function paginateChapterRecord(
  record: ContentChapterRecord,
  maxBytes = CHAPTER_PAGE_BYTES
): ContentChapterRecord[] {
  const empty = byteLength({ ...record, entries: [] });
  const pages: ContentChapterRecord[] = [];
  let entries: ContentChapterEntry[] = [];
  let size = empty;
  for (const entry of record.entries) {
    // +1 for the comma between entries.
    const entrySize = byteLength(entry) + 1;
    if (entries.length > 0 && size + entrySize > maxBytes) {
      pages.push({ ...record, entries });
      entries = [];
      size = empty;
    }
    entries.push(entry);
    size += entrySize;
  }
  pages.push({ ...record, entries });
  return pages;
}

/** Published item count per chapter, for the manifest. */
export function countPublishedChapters(
  items: readonly ContentItem[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const key of publishedChapterKeys(item)) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

/** How much of one book a library covers. */
export interface BookCoverage {
  book: string;
  /** Published items per chapter: `items[0]` is chapter 1. */
  items: number[];
  /** Chapters with at least one item. */
  covered: number;
}

/**
 * Which of the Bible's 1,189 chapters have published content, book by
 * book in canonical order. Chapters outside the 66-book canon don't count.
 */
export function chapterCoverage(chapters: Readonly<Record<string, number>>): {
  covered: number;
  total: number;
  books: BookCoverage[];
} {
  const books = Object.entries(BOOK_CHAPTER_VERSE_COUNTS).map(
    ([book, verseCounts]): BookCoverage => {
      const items = verseCounts.map(
        (_, i) => chapters[contentChapterKey(book, i + 1)] ?? 0
      );
      return { book, items, covered: items.filter((n) => n > 0).length };
    }
  );
  return {
    covered: books.reduce((sum, book) => sum + book.covered, 0),
    total: books.reduce((sum, book) => sum + book.items.length, 0),
    books,
  };
}
