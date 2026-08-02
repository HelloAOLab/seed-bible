import type { LoginManager } from "../managers/LoginManager";
import type { CasualOSManager } from "./OsManager";
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
export declare function clearReadingHistoryDocs(): void;
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
export declare function saveReadingHistory(
  os: CasualOSManager,
  recordName: string,
  userId: string,
  bookId: string,
  chapter: number,
  recencyThresholdSeconds?: number,
  marker?: string,
  name?: string
): Promise<void>;
/**
 * Saves the user's reading history for the given book and chapter.
 * @param bookId The ID of the book.
 * @param chapter The chapter number.
 * @param recencyThresholdSeconds The time in seconds to consider an event recent. Defaults to 30 minutes.
 */
export declare function saveUserReadingHistory(
  os: CasualOSManager,
  login: LoginManager,
  bookId: string,
  chapter: number,
  recencyThresholdSeconds?: number
): Promise<void>;
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
  totalTimeSpentReading: number;
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
      totalTimeSpentReading: number;
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
          totalTimeSpentReading: number;
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
export declare function getTodayTimeSpan(): {
  start: number;
  end: number;
};
/**
 * Gets a time span that goes from the start of this date one year ago to the end of today in unix seconds.
 */
export declare function getPastYearTimeSpan(): {
  start: number;
  end: number;
};
/**
 * Gets a time span that goes from the start of this year to the end of today in unix seconds.
 */
export declare function getCurrentYearTimeSpan(): {
  start: number;
  end: number;
};
/**
 * Gets the reading history summary for the given user for the given time range. Returns null if the user is not logged in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to the reading history summary.
 */
export declare function getUserReadingHistorySummary(
  os: CasualOSManager,
  login: LoginManager,
  startTime: number,
  endTime: number
): Promise<ReadingHistorySummary | null>;
/**
 * Calculates the reading history summary for the given record name and time range.
 * @param recordName The name of the record that the reading history is stored in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to the reading history summary.
 */
export declare function getReadingHistorySummary(
  os: CasualOSManager,
  recordName: string,
  startTime: number,
  endTime: number
): Promise<ReadingHistorySummary>;
/**
 * Gets the reading history events for the given record name and time range.
 * @param recordName The name of the record that the reading history is stored in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to an iterable of reading events.
 */
export declare function getReadingHistoryEvents(
  os: CasualOSManager,
  recordName: string,
  startTime: number,
  endTime: number
): Promise<Iterable<ReadingEvent>>;
/**
 * Filters the given iterable using the provided predicate function.
 * @param iterable The iterable to filter.
 * @param predicate The predicate function to use for filtering.
 */
export declare function filter<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): Generator<T>;
/**
 * Flattens the given iterables into a single iterable.
 * @param iterables The iterables to flatten.
 */
export declare function flat<T>(iterables: Iterable<Iterable<T>>): Generator<T>;
/**
 * Calculates the reading history summary from the given reading events.
 * @param events The events to calculate the summary from.
 */
export declare function calculateReadingHistorySummary(
  events: Iterable<ReadingEvent>
): ReadingHistorySummary;
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
export declare function createReadingHistoryManager(
  os: CasualOSManager,
  login: LoginManager
): ReadingHistoryManager;
