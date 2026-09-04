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
  if (readingHistoryDocs[key]) {
    return readingHistoryDocs[key];
  }

  const markers = [`${marker}:${name}/${year}`];
  const docPromise = (readingHistoryDocs[key] = os.getSharedDocument(
    recordName,
    name,
    `${year}`,
    {
      markers,
    }
  ));
  return docPromise;
}

/**
 * Saves a reading history event ending at the current moment.
 * If the user has already read the chapter within the last 30 minutes, then end time of the event will be updated instead of creating a new event.
 * @param userId The ID of the user that the event is for.
 * @param bookId The ID of the book that the event is for.
 * @param chapter The chapter number that was read.
 * @param recencyThresholdSeconds The time in seconds to consider an event recent. Defaults to 30 minutes.
 * @param marker The marker to use for the reading history document. Use `publicRead` to allow anyone to read, but only users who have access to the record can write. Use `publicWrite` to allow anyone to write. Defaults to `publicRead`.
 * @param name The name of the shared document. Defaults to `reading_history`.
 */
export async function saveReadingHistory(
  os: CasualOSManager,
  recordName: string,
  userId: string,
  bookId: string,
  chapter: number,
  recencyThresholdSeconds: number = 30 * 60,
  marker?: string,
  name?: string
): Promise<void> {
  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  await saveReadingHistorySpan(
    os,
    recordName,
    userId,
    bookId,
    chapter,
    currentTimeSeconds,
    currentTimeSeconds,
    recencyThresholdSeconds,
    marker,
    name
  );
}

/**
 * Saves a stretch of time already spent on a chapter, running from
 * `startTimeSeconds` to `endTimeSeconds`.
 *
 * `saveReadingHistory` can only ever credit the instant it is called, which is
 * no use to audio playback: while a phone is locked the page is frozen and no
 * timer of ours runs, so minutes spent listening can only be recorded after the
 * fact, from how far the audio element's own clock advanced.
 *
 * An existing event for the same chapter is extended when this span continues
 * it. Whether it does is judged from the span's *start*, not from the clock, so
 * a listen that ran longer than `joinThresholdSeconds` still lands on the event
 * it began rather than opening a second one. `end` never moves backwards, so a
 * late-arriving span can't shorten what another writer already recorded.
 *
 * @param startTimeSeconds The unix time in seconds when the span began.
 * @param endTimeSeconds The unix time in seconds when the span ended.
 * @param joinThresholdSeconds How long a gap may sit between an existing event and this span's start for the two to count as one sitting. Defaults to 30 minutes.
 * @param marker The marker to use for the reading history document. Use `publicRead` to allow anyone to read, but only users who have access to the record can write. Use `publicWrite` to allow anyone to write. Defaults to `publicRead`.
 * @param name The name of the shared document. Defaults to `reading_history`.
 */
export async function saveReadingHistorySpan(
  os: CasualOSManager,
  recordName: string,
  userId: string,
  bookId: string,
  chapter: number,
  startTimeSeconds: number,
  endTimeSeconds: number,
  joinThresholdSeconds: number = 30 * 60,
  marker?: string,
  name?: string
): Promise<void> {
  console.log(
    `Saving reading history for user ${userId}, book ${bookId}, chapter ${chapter}`
  );
  const year = new Date(endTimeSeconds * 1000).getUTCFullYear();

  const doc = await getReadingHistoryDocument(
    os,
    recordName,
    year,
    marker,
    name
  );
  const array = doc.getArray("events");
  const event = findMostRecentReadingEvent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    array as YjsSharedArray<SharedMap<any>>,
    userId,
    bookId,
    chapter,
    startTimeSeconds - joinThresholdSeconds
  );
  if (event) {
    if (event.get("end") < endTimeSeconds) {
      event.set("end", endTimeSeconds);
    }
  } else {
    const newEvent = doc.createMap();
    newEvent.set("userId", userId);
    newEvent.set("bookId", bookId);
    newEvent.set("chapter", chapter);
    newEvent.set("start", startTimeSeconds);
    newEvent.set("end", endTimeSeconds);
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

  await saveReadingHistory(
    os,
    userId,
    userId,
    bookId,
    chapter,
    recencyThresholdSeconds
  );
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
 * @param recordName The name of the record that the reading history is stored in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to an iterable of reading events.
 */
export async function getReadingHistoryEvents(
  os: CasualOSManager,
  recordName: string,
  startTime: number,
  endTime: number
): Promise<Iterable<ReadingEvent>> {
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
    );
    allEventPromises.push(events);
  }

  const allEvents = await Promise.all(allEventPromises);
  return flat(allEvents);
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
      console.log(
        `Found recent reading event: ${event.get("bookId")} ${event.get("chapter")} ${new Date(event.get("start") * 1000).toISOString()} - ${new Date(event.get("end") * 1000).toISOString()}`
      );
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

/**
 * How long a gap may sit between an existing sitting and a stretch of measured
 * time before the two count as separate sittings. Deliberately far shorter than
 * the window `saveReadingHistory` merges across: a measured stretch says exactly
 * when it happened, so anything that does not follow on directly is time
 * nothing was watching, and crediting it would be inventing reading.
 */
const SPAN_JOIN_THRESHOLD_SECONDS = 30;

export interface ReadingHistoryManager {
  /**
   * Marks a chapter as being read right now, stretching the end of the sitting
   * it belongs to up to the present. Anything measuring time the app might not
   * have been watching for wants `saveReadingSpan` instead, since the stretch
   * this covers reaches back however long it has been since the last call.
   */
  saveReadingHistory: (
    bookId: string,
    chapter: number,
    recencyThresholdSeconds?: number
  ) => void;
  /**
   * Credits a chapter with a stretch of time that has already passed, rather
   * than with the moment of the call. Audio playback uses this to record
   * listening the app could not record as it happened, because the page was
   * frozen behind a locked screen for all of it; the reader uses it to credit
   * one tick at a time.
   *
   * A stretch only ever joins a sitting it arrives hard on the heels of, so
   * time nothing was watching through opens a new event rather than being
   * swallowed by the one before it.
   */
  saveReadingSpan: (
    bookId: string,
    chapter: number,
    startTimeSeconds: number,
    endTimeSeconds: number
  ) => void;
  getReadingEvents: (
    startTime: number,
    endTime: number
  ) => Promise<Iterable<ReadingEvent>>;
}

export function createReadingHistoryManager(
  os: CasualOSManager,
  login: LoginManager
): ReadingHistoryManager {
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

      await saveReadingHistory(
        os,
        login.userId.value,
        login.userId.value,
        bookId,
        chapter,
        recencyThresholdSeconds,
        marker,
        name
      );
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

    return getReadingHistoryEvents(os, login.userId.value, startTime, endTime);
  };

  const saveReadingSpanForCurrentUser = (
    bookId: string,
    chapter: number,
    startTimeSeconds: number,
    endTimeSeconds: number
  ): void => {
    const userId = login.userId.value;
    if (!userId) {
      // User is not logged in, so we can't save reading history
      return;
    }

    // Deliberately not debounced, unlike the call above: these arrive at
    // moments the page may not survive (going into the background, playback
    // ending), and each one carries timestamps of its own, so a trailing
    // debounce could drop the very save that records the listening.
    saveReadingHistorySpan(
      os,
      userId,
      userId,
      bookId,
      chapter,
      startTimeSeconds,
      endTimeSeconds,
      SPAN_JOIN_THRESHOLD_SECONDS
    ).catch((err) => {
      console.error("Failed to save listening time to reading history", err);
    });
  };

  return {
    saveReadingHistory: saveReadingHistoryForCurrentUser,
    saveReadingSpan: saveReadingSpanForCurrentUser,
    getReadingEvents: getReadingEventsForCurrentUser,
  };
}
