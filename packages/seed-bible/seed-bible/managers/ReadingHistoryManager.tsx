import { debounce } from "es-toolkit";
import type { LoginManager } from "../managers/LoginManager";
import type {
  SharedDocument,
  SharedMap,
} from "@casual-simulation/aux-common/documents/SharedDocument";
import type { CasualOSManager } from "./OsManager";
import type {
  YjsSharedArray,
  YjsSharedMap,
} from "@casual-simulation/aux-common/documents/YjsSharedDocument";
import {
  createIndexedDbReadingHistoryStore,
  readingEventIdentity,
  readingEventYear,
  toReadingEvent,
  type OfflineReadingHistoryStore,
  type StoredReadingEvent,
} from "./OfflineReadingHistoryStore";
import {
  createReadingHistorySyncManager,
  type ReadingHistorySyncManager,
} from "./ReadingHistorySyncManager";

export interface ReadingEvent {
  /**
   * The ID of the book that was read.
   */
  bookId: string;

  /**
   * The number of the chapter that was read.
   */
  chapter: number;

  /**
   * The ID of the user who read the chapter.
   */
  userId: string;

  /**
   * The unix time in seconds when the chapter event was started.
   */
  start: number;

  /**
   * The unix time in seconds when the chapter event was ended.
   */
  end: number;
}

let readingHistoryDocs: Record<string, Promise<SharedDocument>> = {};

export function clearReadingHistoryDocs() {
  readingHistoryDocs = {};
}

/**
 * `undefined` until the first caller asks, so nothing touches IndexedDB during
 * a server render.
 */
let sharedStore: OfflineReadingHistoryStore | null | undefined;

/**
 * The local store the functions in this module use when a caller doesn't name
 * one.
 *
 * A single instance per page load, because it is one database and every reading
 * event on this device belongs in it — `TodayManager` and Scripture Map both
 * call the functions here directly, and each holding its own store would mean
 * each holding its own connection to the same database.
 *
 * Null on a device that can't keep one (server-side rendering, or a browser
 * that blocks storage). Callers fall back to talking to the year document
 * directly, which is what the app did before this store existed.
 */
export function getSharedReadingHistoryStore(): OfflineReadingHistoryStore | null {
  if (sharedStore === undefined) {
    sharedStore = createIndexedDbReadingHistoryStore();
  }
  return sharedStore;
}

/** Resolves an explicit store option against the shared default. */
function resolveStore(
  store: OfflineReadingHistoryStore | null | undefined
): OfflineReadingHistoryStore | null {
  return store === undefined ? getSharedReadingHistoryStore() : store;
}

/**
 * Gets the reading history document for the given record name and year.
 * @param recordName The name of the record that the reading history is stored in.
 * @param year The year to get the reading history for.
 * @param marker The marker to use for the reading history document. Use `publicRead` to allow anyone to read, but only users who have access to the record can write. Use `publicWrite` to allow anyone to write. Defaults to `publicRead`.
 * @param name The name of the shared document. Defaults to `reading_history`.
 * @returns A promise that resolves to the reading history document.
 */
function getReadingHistoryDocument(
  os: CasualOSManager,
  recordName: string,
  year: number,
  marker: string = "publicRead",
  name: string = "reading_history"
): Promise<SharedDocument> {
  const key = `${recordName}-${name}-${year}`;
  const cached = readingHistoryDocs[key];
  if (cached) {
    return cached;
  }

  const markers = [`${marker}:${name}/${year}`];
  // The failure is dropped from the cache rather than kept. A rejected promise
  // left here poisoned the key for the rest of the page load: one expired
  // session key or dropped connection meant every later read and write of that
  // year failed too, with nothing to retry it.
  const docPromise: Promise<SharedDocument> = os
    .getSharedDocument(recordName, name, `${year}`, {
      markers,
    })
    .catch((error: unknown) => {
      if (readingHistoryDocs[key] === docPromise) {
        delete readingHistoryDocs[key];
      }
      throw error;
    });
  readingHistoryDocs[key] = docPromise;
  return docPromise;
}

/**
 * Writes events into a year's document, extending an event it already holds
 * rather than adding a second copy of it.
 *
 * Matching on {@link readingEventIdentity} — user, book, chapter and `start` —
 * is what makes this safe to call again with the same event, which is what the
 * replay in `ReadingHistorySyncManager` needs. Extending is one-way: `end` only
 * moves forward, so an event pushed twice out of order can't shrink.
 */
export async function writeReadingEventsToDocument(
  os: CasualOSManager,
  recordName: string,
  year: number,
  events: readonly ReadingEvent[],
  options: { marker?: string; name?: string } = {}
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const doc = await getReadingHistoryDocument(
    os,
    recordName,
    year,
    options.marker,
    options.name
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const array = doc.getArray("events") as YjsSharedArray<SharedMap<any>>;

  const unmatched = new Map<string, ReadingEvent>();
  for (const event of events) {
    unmatched.set(readingEventIdentity(event), event);
  }

  // Newest first, and stops as soon as everything has been matched. Extending
  // the event currently being read is by far the most common call — five
  // seconds apart, all day — and that event is the newest one in the document,
  // so this normally settles on the first comparison rather than walking a
  // year's worth of events every time.
  for (let i = array.length - 1; i >= 0 && unmatched.size > 0; i--) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: SharedMap<any> = array.type.get(i);
    const identity = readingEventIdentity({
      userId: map.get("userId"),
      bookId: map.get("bookId"),
      chapter: map.get("chapter"),
      start: map.get("start"),
    });
    const event = unmatched.get(identity);
    if (!event) {
      continue;
    }
    if (map.get("end") < event.end) {
      map.set("end", event.end);
    }
    unmatched.delete(identity);
  }

  // Whatever is left is an event the document has never seen.
  for (const event of unmatched.values()) {
    const map = doc.createMap();
    map.set("userId", event.userId);
    map.set("bookId", event.bookId);
    map.set("chapter", event.chapter);
    map.set("start", event.start);
    map.set("end", event.end);
    array.push(map);
  }
}

/** Options for {@link saveReadingHistory}. */
export interface SaveReadingHistoryOptions {
  /**
   * How far back a tick may reach to extend an event rather than start a new
   * one. Defaults to 30 minutes.
   */
  recencyThresholdSeconds?: number;

  /**
   * The marker to use for the reading history document. Use `publicRead` to
   * allow anyone to read, but only users who have access to the record can
   * write. Use `publicWrite` to allow anyone to write. Defaults to
   * `publicRead`.
   */
  marker?: string;

  /** The name of the shared document. Defaults to `reading_history`. */
  name?: string;

  /**
   * Where the event is recorded before it is pushed. Defaults to the shared
   * store; pass null to write straight to the document.
   */
  store?: OfflineReadingHistoryStore | null;

  /** Injected in tests. Defaults to the wall clock. */
  nowSeconds?: number;
}

/**
 * Records the event on this device, or null when it can't be.
 *
 * `createIndexedDbReadingHistoryStore` only knows that IndexedDB *exists*; a
 * browser can still refuse to open the database (a private window in some
 * browsers, a sandboxed frame, a user who has blocked site data). That is not a
 * reason to stop recording reading history altogether, so a store failure falls
 * through to writing straight to the year document — what the app did before
 * this store existed, durability aside.
 */
async function recordReadingLocally(
  store: OfflineReadingHistoryStore,
  input: {
    userId: string;
    bookId: string;
    chapter: number;
    atSeconds: number;
    recencyThresholdSeconds: number;
  }
): Promise<StoredReadingEvent | null> {
  try {
    return await store.recordReading(input);
  } catch (error) {
    console.warn(
      "Could not record reading history on this device. Writing straight to the document instead.",
      error
    );
    return null;
  }
}

/**
 * Records that a chapter is being read, and pushes it to the server.
 *
 * The event lands in the local store first, so it survives the tab closing even
 * if the push never goes out. Only then is the year document written, and a
 * failure there leaves the row queued for `ReadingHistorySyncManager` to replay
 * — so the caller can treat this rejecting as "not yet", not as "lost".
 *
 * Reading the same chapter again within `recencyThresholdSeconds` extends that
 * event's `end` instead of starting a new one, so a chapter read for half an
 * hour is one event rather than 360 of them.
 *
 * @param userId The ID of the user that the event is for.
 * @param bookId The ID of the book that the event is for.
 * @param chapter The chapter number that was read.
 */
export async function saveReadingHistory(
  os: CasualOSManager,
  recordName: string,
  userId: string,
  bookId: string,
  chapter: number,
  options: SaveReadingHistoryOptions = {}
): Promise<void> {
  const {
    recencyThresholdSeconds = 30 * 60,
    marker,
    name,
    nowSeconds,
  } = options;
  const store = resolveStore(options.store);
  const currentTimeSeconds = nowSeconds ?? Math.floor(Date.now() / 1000);
  const currentYear = readingEventYear(currentTimeSeconds);

  const row = store
    ? await recordReadingLocally(store, {
        userId,
        bookId,
        chapter,
        atSeconds: currentTimeSeconds,
        recencyThresholdSeconds,
      })
    : null;

  if (row && store) {
    // The event is now safe on this device, so the push is allowed to fail.
    await writeReadingEventsToDocument(
      os,
      recordName,
      row.year,
      [toReadingEvent(row)],
      { marker, name }
    );
    try {
      await store.markSynced([{ key: row.key, end: row.end }]);
    } catch (error) {
      // The push itself worked, so this must not look like a failed push to the
      // caller. The row simply stays queued and the replay pushes it again,
      // which extends the event it already wrote rather than duplicating it.
      console.warn("Could not mark a reading event as pushed.", error);
    }
    return;
  }

  // No local store: the document is the only place the event can go, so which
  // event this tick belongs to has to be worked out from what is already in it.
  const doc = await getReadingHistoryDocument(
    os,
    recordName,
    currentYear,
    marker,
    name
  );
  const recencyThreshold = currentTimeSeconds - recencyThresholdSeconds;
  const array = doc.getArray("events");
  const event = findMostRecentReadingEvent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    array as YjsSharedArray<SharedMap<any>>,
    userId,
    bookId,
    chapter,
    recencyThreshold
  );
  if (event) {
    event.set("end", currentTimeSeconds);
  } else {
    const newEvent = doc.createMap();
    newEvent.set("userId", userId);
    newEvent.set("bookId", bookId);
    newEvent.set("chapter", chapter);
    newEvent.set("start", currentTimeSeconds);
    newEvent.set("end", currentTimeSeconds);
    array.push(newEvent);
  }
}

/**
 * Saves the user's reading history for the given book and chapter.
 * @param bookId The ID of the book.
 * @param chapter The chapter number.
 * @param recencyThresholdSeconds The time in seconds to consider an event recent. Defaults to 30 minutes.
 */
export async function saveUserReadingHistory(
  os: CasualOSManager,
  login: LoginManager,
  bookId: string,
  chapter: number,
  recencyThresholdSeconds: number = 30 * 60
): Promise<void> {
  const userId = login.userId.value;

  if (!userId) {
    // User is not logged in, so we can't save reading history
    return;
  }

  await saveReadingHistory(os, userId, userId, bookId, chapter, {
    recencyThresholdSeconds,
  });
}

/**
 * An interface representing a summary of reading history.
 */
export interface ReadingHistorySummary {
  /**
   * The total number of books that were read over the time period.
   *
   * That is, the number of books that have at least one chapter read, per user.
   *
   * e.g. If user1 read Genesis and Exodus, and user2 read Genesis, then totalBooksRead is 3.
   */
  totalBooksRead: number;

  /**
   * The total number of chapters that were read over the time period.
   *
   * That is, the number of chapters that were read per user.
   *
   * e.g. If user1 read Genesis chapters 1 and 2, and user2 read Genesis chapter 1, then totalChaptersRead is 3.
   */
  totalChaptersRead: number;

  /**
   * The total time spent reading over the time period (in seconds).
   */
  totalTimeSpentReading: number; // in seconds

  /**
   * The per-user reading summaries.
   */
  users: {
    /**
     * The per-user reading summaries.
     */
    [userId: string]: {
      /**
       * The unique number of books that the user read over the time period.
       */
      uniqueBooksRead: number;

      /**
       * The unique number of chapters that the user read over the time period.
       */
      uniqueChaptersRead: number;

      /**
       * The total time the user spent reading over the time period (in seconds).
       */
      totalTimeSpentReading: number; // in seconds

      /**
       * The per-book reading summaries for the user.
       */
      books: {
        [bookId: string]: {
          /**
           * The total number of chapters that the user read in this book over the time period.
           */
          uniqueChaptersRead: number;

          /**
           * The total time the user spent reading this book over the time period (in seconds).
           */
          totalTimeSpentReading: number; // in seconds

          /**
           * The per-chapter reading events for the user in this book.
           */
          chapters: {
            [chapterNumber: number]: ReadingEvent[];
          };
        };
      };
    };
  };

  /**
   * The time of the first event in the summary (in unix seconds).
   */
  startTime: number;

  /**
   * The time of the last event in the summary (in unix seconds).
   */
  endTime: number;
}

/**
 * Gets a time span that goes from the start of today to the end of today in unix seconds.
 */
export function getTodayTimeSpan() {
  const now = new Date();
  const startOfDay =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
  const endOfDay =
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59
    ) / 1000; // End of day in unix seconds

  return { start: startOfDay, end: endOfDay };
}

/**
 * Gets a time span that goes from the start of this date one year ago to the end of today in unix seconds.
 */
export function getPastYearTimeSpan() {
  const now = new Date();
  const startOfDay =
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()) /
    1000;
  const endOfDay =
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59
    ) / 1000; // End of day in unix seconds

  return { start: startOfDay, end: endOfDay };
}

/**
 * Gets a time span that goes from the start of this year to the end of today in unix seconds.
 */
export function getCurrentYearTimeSpan() {
  const now = new Date();
  const startOfDay = Date.UTC(now.getUTCFullYear(), 1, 1) / 1000;
  const endOfDay =
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59
    ) / 1000; // End of day in unix seconds

  return { start: startOfDay, end: endOfDay };
}

/**
 * Gets the reading history summary for the given user for the given time range. Returns null if the user is not logged in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to the reading history summary.
 */
export async function getUserReadingHistorySummary(
  os: CasualOSManager,
  login: LoginManager,
  startTime: number,
  endTime: number
): Promise<ReadingHistorySummary | null> {
  const userId = login.userId.value;

  if (!userId) {
    // User is not logged in, so we can't get reading history
    return null;
  }

  return getReadingHistorySummary(os, userId, startTime, endTime);
}

/**
 * Calculates the reading history summary for the given record name and time range.
 * @param recordName The name of the record that the reading history is stored in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to the reading history summary.
 */
export async function getReadingHistorySummary(
  os: CasualOSManager,
  recordName: string,
  startTime: number,
  endTime: number
): Promise<ReadingHistorySummary> {
  const events = await getReadingHistoryEvents(
    os,
    recordName,
    startTime,
    endTime
  );
  return calculateReadingHistorySummary(events);
}

/**
 * Gets the reading history events for the given record name and time range.
 *
 * Answers from two places at once: the year documents on the server, and what
 * this device recorded locally. The local rows are why today's reading shows up
 * straight away rather than after a round trip, and why it shows up at all on a
 * load with no connection.
 *
 * A year whose document can't be reached is logged and treated as empty rather
 * than failing the whole read. Before, one unreachable document took the Today
 * screen down with it, even though the reading it was asking about was sitting
 * on the device.
 *
 * @param recordName The name of the record that the reading history is stored in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to an iterable of reading events.
 */
export async function getReadingHistoryEvents(
  os: CasualOSManager,
  recordName: string,
  startTime: number,
  endTime: number,
  options: { store?: OfflineReadingHistoryStore | null } = {}
): Promise<Iterable<ReadingEvent>> {
  const store = resolveStore(options.store);
  const startYear = new Date(startTime * 1000).getUTCFullYear();
  const endYear = new Date(endTime * 1000).getUTCFullYear();
  const allEventPromises: Promise<Iterable<ReadingEvent>>[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const events = getYearlyReadingHistoryEvents(
      os,
      recordName,
      y,
      startTime,
      endTime
    ).catch((error: unknown) => {
      console.warn(
        `Could not read the ${y} reading history document for ${recordName}. Falling back to what this device has.`,
        error
      );
      return [] as ReadingEvent[];
    });
    allEventPromises.push(events);
  }

  // Keyed on `recordName` because that is the record a user's reading history
  // lives in — so this contributes nothing when the caller is reading somebody
  // else's history, which is the correct answer for a store that only holds
  // this device's own.
  allEventPromises.push(
    readLocalReadingEvents(store, recordName, startTime, endTime)
  );

  const allEvents = await Promise.all(allEventPromises);
  return mergeReadingEvents(allEvents);
}

/** This device's own recorded events for a window, or none if it has no store. */
async function readLocalReadingEvents(
  store: OfflineReadingHistoryStore | null,
  userId: string,
  startTime: number,
  endTime: number
): Promise<ReadingEvent[]> {
  if (!store) {
    return [];
  }
  try {
    const rows = await store.listForWindow(userId, startTime, endTime);
    return rows.map(toReadingEvent);
  } catch (error) {
    console.warn("Could not read locally recorded reading events.", error);
    return [];
  }
}

/**
 * Folds several sources of events into one list, keeping each event once.
 *
 * An event recorded locally and then pushed exists in both places, so without
 * this every summary would count its time twice. Two copies of one event are
 * recognised by {@link readingEventIdentity} and the later `end` wins, which is
 * always the more complete of the two — `end` only moves forward.
 */
export function mergeReadingEvents(
  sources: Iterable<Iterable<ReadingEvent>>
): ReadingEvent[] {
  const byIdentity = new Map<string, ReadingEvent>();
  for (const source of sources) {
    for (const event of source) {
      const identity = readingEventIdentity(event);
      const existing = byIdentity.get(identity);
      if (!existing || existing.end < event.end) {
        byIdentity.set(identity, event);
      }
    }
  }
  return [...byIdentity.values()];
}

/**
 * Gets the reading history events for the given record name and year.
 * @param recordName The name of the record that the reading history is stored in.
 * @param year The year to get the reading history events for.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @param marker The marker to use for the reading history document. Use `publicRead` to allow anyone to read, but only users who have access to the record can write. Use `publicWrite` to allow anyone to write. Defaults to `publicRead`.
 * @param name The name of the shared document. Defaults to `reading_history`.
 * @returns
 */
async function getYearlyReadingHistoryEvents(
  os: CasualOSManager,
  recordName: string,
  year: number,
  startTime: number,
  endTime: number,
  marker?: string,
  name?: string
): Promise<Iterable<ReadingEvent>> {
  const doc = await getReadingHistoryDocument(
    os,
    recordName,
    year,
    marker,
    name
  );
  const events = filter(
    getReadingEvents(doc),
    (e) => e.start >= startTime && e.start < endTime
  );
  return events;
}

/**
 * Filters the given iterable using the provided predicate function.
 * @param iterable The iterable to filter.
 * @param predicate The predicate function to use for filtering.
 */
export function* filter<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): Generator<T> {
  for (const item of iterable) {
    if (predicate(item)) {
      yield item;
    }
  }
}

/**
 * Flattens the given iterables into a single iterable.
 * @param iterables The iterables to flatten.
 */
export function* flat<T>(iterables: Iterable<Iterable<T>>): Generator<T> {
  for (const iterable of iterables) {
    for (const item of iterable) {
      yield item;
    }
  }
}

function* getReadingEvents(doc: SharedDocument): Generator<ReadingEvent> {
  const eventsArray =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc.getArray("events") as YjsSharedArray<YjsSharedMap<any>>).type;

  for (let i = 0; i < eventsArray.length; i++) {
    const e = eventsArray.get(i);
    const event: ReadingEvent = {
      userId: e.get("userId"),
      bookId: e.get("bookId"),
      chapter: e.get("chapter"),
      start: e.get("start"),
      end: e.get("end"),
    };

    yield event;
  }
}

/**
 * Calculates the reading history summary from the given reading events.
 * @param events The events to calculate the summary from.
 */
export function calculateReadingHistorySummary(
  events: Iterable<ReadingEvent>
): ReadingHistorySummary {
  const summary: ReadingHistorySummary = {
    totalBooksRead: 0,
    totalChaptersRead: 0,
    totalTimeSpentReading: 0,
    users: {},
    startTime: Infinity,
    endTime: -Infinity,
  };

  for (const event of events) {
    if (event.start < summary.startTime) {
      summary.startTime = event.start;
    }
    if (event.end > summary.endTime) {
      summary.endTime = event.end;
    }
    const length = event.end - event.start;
    summary.totalTimeSpentReading += length;
    const userSummary = (summary.users[event.userId] ??= {
      uniqueBooksRead: 0,
      uniqueChaptersRead: 0,
      totalTimeSpentReading: 0,
      books: {},
    });

    userSummary.totalTimeSpentReading += length;
    const bookSummary = (userSummary.books[event.bookId] ??= {
      uniqueChaptersRead: 0,
      totalTimeSpentReading: 0,
      chapters: {},
    });

    bookSummary.totalTimeSpentReading += length;

    const chapterEvents = (bookSummary.chapters[event.chapter] ??= []);
    chapterEvents.push(event);
  }

  updateSummaryTotals(summary);

  return summary;
}

function updateSummaryTotals(summary: ReadingHistorySummary) {
  // After processing all events, calculate uniqueChaptersRead
  for (const userId in summary.users) {
    const user = summary.users[userId];
    if (!user) {
      continue;
    }
    for (const bookId in user.books) {
      const book = user.books[bookId];
      if (!book) {
        continue;
      }
      user.uniqueBooksRead += 1;
      user.uniqueChaptersRead += Object.keys(book.chapters).length;
      book.uniqueChaptersRead = Object.keys(book.chapters).length;
      summary.totalBooksRead += 1;
    }
    summary.totalChaptersRead += user.uniqueChaptersRead;
  }
}

/**
 * Finds the most recent reading event for the given user, book, and chapter.
 * @param events The list of reading events.
 * @param userId The ID of the user.
 * @param bookId The ID of the book.
 * @param chapter The chapter number.
 * @returns The most recent reading event, or null if no event was found.
 */
function findMostRecentReadingEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: YjsSharedArray<SharedMap<any>>,
  userId: string,
  bookId: string,
  chapter: number,
  oldestTime: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): SharedMap<any> | null {
  for (let i = events.length - 1; i >= 0; i--) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event: SharedMap<any> = events.type.get(i);
    if (event.get("end") < oldestTime) {
      break;
    }

    if (
      event.get("userId") === userId &&
      event.get("bookId") === bookId &&
      event.get("chapter") === chapter
    ) {
      return event;
    }
  }
  return null;
}

/** Reading events grouped under a caller-supplied day key. */
export type ReadingEventsByDay = Map<string, ReadingEvent[]>;

/** One summary per day key, over the events in {@link ReadingEventsByDay}. */
export type DailyReadingHistorySummaries = Map<string, ReadingHistorySummary>;

export interface DailyReadingHistory {
  /** Every fetched event, flattened across readers. */
  events: ReadingEvent[];
  /** Only days that had at least one qualifying event appear. */
  eventsByDay: ReadingEventsByDay;
  summariesByDay: DailyReadingHistorySummaries;
  /** Summary over every fetched event, not just the bucketed ones. */
  total: ReadingHistorySummary;
}

const SECONDS_PER_DAY = 60 * 60 * 24;

/**
 * Fetches every reader's events for a window and buckets them into calendar
 * days, summarizing each day and the window as a whole.
 *
 * This is the shape both reading-history timelines need — the Today screen's
 * and Scripture Map's — which had drifted into two near-identical copies of the
 * same loop.
 *
 * Summarizing a year of days is enough work to drop frames, so it yields to the
 * event loop every `yieldEvery` days. That makes this async purely for
 * cooperativeness, not because the work itself needs it.
 *
 * Takes a `fetchEvents` function rather than the `os` client so callers can
 * supply an already-bound fetcher (and tests a plain fake).
 */
export async function loadDailyReadingHistory(options: {
  fetchEvents: (
    readerId: string,
    startSeconds: number,
    endSeconds: number
  ) => Promise<Iterable<ReadingEvent>>;
  readerIds: readonly string[];
  /** Day keys in calendar order, starting at `startSeconds`. */
  dayKeys: readonly string[];
  startSeconds: number;
  endSeconds: number;
  /** Events shorter than this are ignored entirely. Defaults to one minute. */
  minDurationSeconds?: number;
  /** Days summarized between yields. Defaults to 30. */
  yieldEvery?: number;
}): Promise<DailyReadingHistory> {
  const {
    fetchEvents,
    readerIds,
    dayKeys,
    startSeconds,
    endSeconds,
    minDurationSeconds = 60,
    yieldEvery = 30,
  } = options;

  const eventsByDay: ReadingEventsByDay = new Map();
  const summariesByDay: DailyReadingHistorySummaries = new Map();

  if (readerIds.length === 0) {
    return {
      events: [],
      eventsByDay,
      summariesByDay,
      total: calculateReadingHistorySummary([]),
    };
  }

  const perReader = await Promise.all(
    readerIds.map((readerId) => fetchEvents(readerId, startSeconds, endSeconds))
  );
  const events = Array.from(flat(perReader));

  for (const event of events) {
    if (event.end - event.start < minDurationSeconds) {
      continue;
    }

    const dayIndex = Math.floor((event.start - startSeconds) / SECONDS_PER_DAY);
    if (dayIndex < 0 || dayIndex >= dayKeys.length) {
      continue;
    }

    const key = dayKeys[dayIndex];
    if (!key) {
      continue;
    }

    let dayEvents = eventsByDay.get(key);
    if (!dayEvents) {
      dayEvents = [];
      eventsByDay.set(key, dayEvents);
    }
    dayEvents.push(event);
  }

  const yieldToMain = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 0));

  let summarized = 0;
  for (const [dayKey, dayEvents] of eventsByDay) {
    summariesByDay.set(dayKey, calculateReadingHistorySummary(dayEvents));
    summarized++;
    if (summarized % yieldEvery === 0) {
      await yieldToMain();
    }
  }

  await yieldToMain();

  return {
    events,
    eventsByDay,
    summariesByDay,
    total: calculateReadingHistorySummary(events),
  };
}

export interface ReadingHistoryManager {
  saveReadingHistory: (
    bookId: string,
    chapter: number,
    recencyThresholdSeconds?: number
  ) => void;
  getReadingEvents: (
    startTime: number,
    endTime: number
  ) => Promise<Iterable<ReadingEvent>>;

  /** Replays anything the server hasn't got yet. */
  sync: ReadingHistorySyncManager;

  /** Tears down the sync manager. The app never calls this; tests do. */
  dispose: () => void;
}

export interface CreateReadingHistoryManagerOptions {
  /**
   * Where events are recorded before they are pushed. Defaults to the shared
   * store; pass null to write straight to the year documents.
   */
  store?: OfflineReadingHistoryStore | null;
}

export function createReadingHistoryManager(
  os: CasualOSManager,
  login: LoginManager,
  options: CreateReadingHistoryManagerOptions = {}
): ReadingHistoryManager {
  const store = resolveStore(options.store);

  const sync = createReadingHistorySyncManager({
    login,
    store,
    writeEvents: (recordName, year, events) =>
      writeReadingEventsToDocument(os, recordName, year, events),
  });

  const saveReadingHistoryForCurrentUser = debounce(
    async (
      bookId: string,
      chapter: number,
      recencyThresholdSeconds: number = 30 * 60,
      marker?: string,
      name?: string
    ) => {
      if (!login.userId.value) {
        // User is not logged in, so we can't save reading history
        return;
      }

      try {
        await saveReadingHistory(
          os,
          login.userId.value,
          login.userId.value,
          bookId,
          chapter,
          { recencyThresholdSeconds, marker, name, store }
        );
      } catch (error) {
        // The event is in the local store either way, so this is "not pushed
        // yet" rather than "lost". Swallowed because the five-second tick
        // discards this promise, and an unhandled rejection every five seconds
        // was the whole reason the failure went unnoticed.
        console.warn(
          `Could not push reading history for ${bookId} ${chapter} yet.`,
          error
        );
        void sync.refreshPendingCount();
        return;
      }

      // The push getting through proves the year document is reachable, which is
      // the moment a backlog is worth retrying. Waiting for the `online` event
      // would miss a websocket that reconnected without `navigator.onLine` ever
      // changing.
      if (sync.pendingCount.value > 0) {
        void sync.sync();
      }
    },
    300
  );

  const getReadingEventsForCurrentUser = async (
    startTime: number,
    endTime: number
  ): Promise<Iterable<ReadingEvent>> => {
    if (!login.userId.value) {
      return [];
    }

    return getReadingHistoryEvents(os, login.userId.value, startTime, endTime, {
      store,
    });
  };

  return {
    saveReadingHistory: saveReadingHistoryForCurrentUser,
    getReadingEvents: getReadingEventsForCurrentUser,
    sync,
    dispose: () => sync.dispose(),
  };
}
