import {
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
      mediaKind: resolveLinkMedia(item.url).kind,
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
