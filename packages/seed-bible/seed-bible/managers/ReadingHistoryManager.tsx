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
 * Saves a reading history event.
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
  console.log(
    `Saving reading history for user ${userId}, book ${bookId}, chapter ${chapter}`
  );
  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  const currentYear = new Date().getUTCFullYear();

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
  bookId: string,
  chapter: number,
  recencyThresholdSeconds: number = 30 * 60
): Promise<void> {
  const authBot = await os.requestAuthBotInBackground();

  if (!authBot) {
    // User is not logged in, so we can't save reading history
    return;
  }

  await saveReadingHistory(
    os,
    authBot.id,
    authBot.id,
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
  startTime: number,
  endTime: number
): Promise<ReadingHistorySummary | null> {
  const authBot = await os.requestAuthBotInBackground();

  if (!authBot) {
    // User is not logged in, so we can't get reading history
    return null;
  }

  return getReadingHistorySummary(os, authBot.id, startTime, endTime);
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

  return {
    saveReadingHistory: saveReadingHistoryForCurrentUser,
    getReadingEvents: getReadingEventsForCurrentUser,
  };
}
