import type { ReadingEvent } from "./ReadingHistoryManager";
import { annotationVerseNumbers, type Annotation } from "./AnnotationsManager";
import type { Timespan } from "./TodayReadingHistory";

/** Which kinds of activity the community feed is filtered to. */
export type CommunityFeedKind = "all" | "notes" | "reading";

/** A note someone wrote on a passage. */
export interface NoteFeedItem {
  type: "note";
  id: string;
  userId: string;
  bookId: string;
  chapter: number;
  /** The verses the note is attached to, ascending; empty for a chapter note. */
  verses: number[];
  html: string;
  /** Whether the note answers another note rather than the passage itself. */
  isReply: boolean;
  /** Unix seconds. */
  time: number;
}

/** Two or more readers who read the same chapters of a book in the window. */
export interface CrossedPathsFeedItem {
  type: "crossed-paths";
  id: string;
  bookId: string;
  /** Ascending, deduplicated. */
  chapters: number[];
  /** Every reader who read all of `chapters`, in the order they were given. */
  userIds: string[];
  /** Unix seconds of the most recent reading in the group. */
  time: number;
}

/** The book one reader spent the most time in on one day. */
export interface ReadingFeedItem {
  type: "reading";
  id: string;
  userId: string;
  bookId: string;
  /** Ascending, deduplicated. */
  chapters: number[];
  /** Unix seconds of the reader's last reading in that book that day. */
  time: number;
}

export type CommunityFeedItem =
  | NoteFeedItem
  | CrossedPathsFeedItem
  | ReadingFeedItem;

/**
 * Events shorter than this are not reading. Matches the timeline's threshold
 * (`loadDailyReadingHistory`): a chapter the reader paged through on the way
 * somewhere else would otherwise widen a range to "John 2-9" when they read 2
 * and 9.
 */
export const MIN_FEED_EVENT_SECONDS = 60;

/**
 * The start of the local calendar day that holds `seconds`, in unix seconds.
 * Local rather than UTC because "what I read today" is the reader's today.
 */
export function startOfLocalDay(seconds: number): number {
  const date = new Date(seconds * 1000);
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function sortedUnique(numbers: Iterable<number>): number[] {
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

function sortByTimeDesc<T extends { time: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.time - a.time);
}

/**
 * Crossed paths: every chapter that two or more readers both read. Chapters of
 * the same book read by exactly the same set of readers fold into one item, so
 * "You and Jonah both read Colossians 3" and "... Colossians 4" become
 * "... Colossians 3-4". The item sits in the feed at the most recent of those
 * readings.
 *
 * Readers are keyed by the record their events were fetched under, not by
 * `event.userId`, to match the reader list the caller supplied.
 */
export function groupCrossedPaths(
  eventsByReader: ReadonlyMap<string, readonly ReadingEvent[]>
): CrossedPathsFeedItem[] {
  // book -> chapter -> reader -> latest end
  const latestEndByChapter = new Map<
    string,
    Map<number, Map<string, number>>
  >();
  for (const [readerId, events] of eventsByReader) {
    for (const event of events) {
      let chapters = latestEndByChapter.get(event.bookId);
      if (!chapters) {
        chapters = new Map();
        latestEndByChapter.set(event.bookId, chapters);
      }
      let readers = chapters.get(event.chapter);
      if (!readers) {
        readers = new Map();
        chapters.set(event.chapter, readers);
      }
      readers.set(
        readerId,
        Math.max(readers.get(readerId) ?? -Infinity, event.end)
      );
    }
  }

  const readerOrder = [...eventsByReader.keys()];
  const groups = new Map<string, CrossedPathsFeedItem>();
  for (const [bookId, chapters] of latestEndByChapter) {
    for (const [chapter, readers] of chapters) {
      if (readers.size < 2) continue;

      const userIds = readerOrder.filter((id) => readers.has(id));
      const key = `${bookId}|${userIds.join(",")}`;
      const time = Math.max(...readers.values());
      const existing = groups.get(key);
      if (existing) {
        existing.chapters.push(chapter);
        existing.time = Math.max(existing.time, time);
      } else {
        groups.set(key, {
          type: "crossed-paths",
          id: `crossed-paths:${key}`,
          bookId,
          chapters: [chapter],
          userIds,
          time,
        });
      }
    }
  }

  for (const group of groups.values()) {
    group.chapters = sortedUnique(group.chapters);
  }
  return sortByTimeDesc([...groups.values()]);
}

/**
 * One reader's prominent reading, one item per local calendar day: the book
 * they spent the most time in that day, with every chapter of it they read.
 * The other books they touched that day are left out — a reader who spent half
 * an hour in John 2-5 and five minutes in Romans 3 reads "John 2-5".
 *
 * A day is the day the reading started; a sitting that runs past midnight
 * stays with the day it began. Ties on time go to the book read most recently.
 */
export function groupDailyReading(
  readerId: string,
  events: readonly ReadingEvent[]
): ReadingFeedItem[] {
  type BookDay = { seconds: number; chapters: number[]; latestEnd: number };
  // day start -> book -> totals
  const days = new Map<number, Map<string, BookDay>>();

  for (const event of events) {
    const day = startOfLocalDay(event.start);
    let books = days.get(day);
    if (!books) {
      books = new Map();
      days.set(day, books);
    }
    let book = books.get(event.bookId);
    if (!book) {
      book = { seconds: 0, chapters: [], latestEnd: -Infinity };
      books.set(event.bookId, book);
    }
    book.seconds += Math.max(0, event.end - event.start);
    book.chapters.push(event.chapter);
    book.latestEnd = Math.max(book.latestEnd, event.end);
  }

  const items: ReadingFeedItem[] = [];
  for (const [day, books] of days) {
    let top: { bookId: string; book: BookDay } | undefined;
    for (const [bookId, book] of books) {
      if (
        !top ||
        book.seconds > top.book.seconds ||
        (book.seconds === top.book.seconds &&
          book.latestEnd > top.book.latestEnd)
      ) {
        top = { bookId, book };
      }
    }
    if (!top) continue;
    items.push({
      type: "reading",
      id: `reading:${readerId}:${day}`,
      userId: readerId,
      bookId: top.bookId,
      chapters: sortedUnique(top.book.chapters),
      time: top.book.latestEnd,
    });
  }

  return sortByTimeDesc(items);
}

/**
 * Drops from each reader's daily items the chapters a crossed-paths item
 * already shows for them, so a chapter never appears twice for the same
 * person. An item left with no chapters goes away.
 */
export function withoutCrossedPathsChapters(
  readingItems: readonly ReadingFeedItem[],
  crossedPaths: readonly CrossedPathsFeedItem[]
): ReadingFeedItem[] {
  if (crossedPaths.length === 0) return [...readingItems];

  const result: ReadingFeedItem[] = [];
  for (const item of readingItems) {
    const shared = new Set<number>();
    for (const crossed of crossedPaths) {
      if (
        crossed.bookId === item.bookId &&
        crossed.userIds.includes(item.userId)
      ) {
        for (const chapter of crossed.chapters) shared.add(chapter);
      }
    }
    const chapters = item.chapters.filter((chapter) => !shared.has(chapter));
    if (chapters.length > 0) {
      result.push({ ...item, chapters });
    }
  }
  return result;
}

/** The instant a note was written, in unix seconds, or undefined if unknown. */
function noteTimeSeconds(annotation: Annotation): number | undefined {
  const ms = annotation.data.createdAtMs ?? annotation.data.updatedAtMs;
  return typeof ms === "number" && Number.isFinite(ms)
    ? Math.floor(ms / 1000)
    : undefined;
}

/**
 * The notes written inside `span`, newest first. A note with no timestamp
 * (written before notes recorded one) has no place on a timeline and is left
 * out.
 */
export function noteFeedItems(
  notesByUser: ReadonlyMap<string, readonly Annotation[]>,
  span: Timespan
): NoteFeedItem[] {
  const items: NoteFeedItem[] = [];
  for (const [userId, notes] of notesByUser) {
    for (const note of notes) {
      if (note.data.type !== "comment") continue;
      const time = noteTimeSeconds(note);
      if (time === undefined || time < span.from || time > span.to) continue;
      items.push({
        type: "note",
        id: `note:${userId}:${note.id}`,
        userId,
        bookId: note.bookId,
        chapter: note.chapterNumber,
        verses: sortedUnique(annotationVerseNumbers(note)),
        html: note.data.html,
        isReply: Boolean(note.data.replyTo),
        time,
      });
    }
  }
  return sortByTimeDesc(items);
}

/**
 * The whole feed for one window, newest first.
 *
 * Reading is shown two ways, per #1848: chapters that several readers share
 * become crossed-paths items (unless `crossedPaths` is off, which the "all"
 * window asks for), and what remains is each reader's prominent book per day.
 * Events shorter than `minDurationSeconds` are ignored throughout.
 */
export function buildCommunityFeed(input: {
  eventsByReader: ReadonlyMap<string, readonly ReadingEvent[]>;
  notesByUser: ReadonlyMap<string, readonly Annotation[]>;
  span: Timespan;
  crossedPaths: boolean;
  minDurationSeconds?: number;
}): CommunityFeedItem[] {
  const minDuration = input.minDurationSeconds ?? MIN_FEED_EVENT_SECONDS;

  const eventsByReader = new Map<string, ReadingEvent[]>();
  for (const [readerId, events] of input.eventsByReader) {
    eventsByReader.set(
      readerId,
      events.filter(
        (event) =>
          event.end - event.start >= minDuration &&
          event.end >= input.span.from &&
          event.end <= input.span.to
      )
    );
  }

  const crossed = input.crossedPaths ? groupCrossedPaths(eventsByReader) : [];
  const daily: ReadingFeedItem[] = [];
  for (const [readerId, events] of eventsByReader) {
    daily.push(...groupDailyReading(readerId, events));
  }

  return sortByTimeDesc<CommunityFeedItem>([
    ...noteFeedItems(input.notesByUser, input.span),
    ...crossed,
    ...withoutCrossedPathsChapters(daily, crossed),
  ]);
}
