import { z } from "https://esm.helloao.org/vendor-3PZUL55I.js";

/**
 * Defines an annotation. That is, a piece of information associated with a specific chapter of the Bible.
 */
export interface Annotation {
  /**
   * The ID of the annotation.
   */
  id: string;

  /**
   * The ID of the book that the annotation is for.
   */
  bookId: string;

  /**
   * The chapter number that the annotation is for.
   */
  chapterNumber: number;

  /**
   * The optional verse number that the annotation is for.
   */
  verseNumber?: number;

  /**
   * The optional verse number that the annotation ends at (inclusive).
   */
  endVerseNumber?: number;

  /**
   * The data of the annotation.
   */
  data: AnnotationData;

  /**
   * The optional sort order of the annotation.
   */
  order?: number;
}

export type AnnotationData = CommentAnnotationData;

export const COMMENT_SCHEMA = z.object({
  type: z.literal("comment"),
  html: z.string(),
  replyTo: z.nullable(z.optional(z.string())),

  // The Time in miliseconds that the comment was created
  createdAtMs: z.nullable(z.optional(z.number())),

  // The Time in miliseconds that the comment was last updated
  updatedAtMs: z.nullable(z.optional(z.number())),

  // user profile picture
  userProfilePicture: z.nullable(z.optional(z.string())),

  // user name
  userName: z.nullable(z.optional(z.string())),

  // user id
  userId: z.nullable(z.optional(z.string())),

  // tags
  tags: z.nullable(z.optional(z.array(z.string()))),
});

export const ANNOTATION_DATA_SCHEMA = z.discriminatedUnion("type", [
  COMMENT_SCHEMA,
]);

export const ANNOTATION_SCHEMA = z.object({
  id: z.string(),
  bookId: z.string(),
  chapterNumber: z.number(),
  verseNumber: z.nullable(z.optional(z.number())),
  endVerseNumber: z.nullable(z.optional(z.number())),
  data: ANNOTATION_DATA_SCHEMA,
  order: z.nullable(z.optional(z.number())),
  verseNumbers: z.nullable(z.optional(z.array(z.number()))),
});

/**
 * Data for a comment annotation.
 */
export interface CommentAnnotationData {
  type: "comment";

  /**
   * The html content of the comment.
   *
   * @see https://tiptap.dev/docs/guides/output-json-html#option-2-generate-html-from-prosemirror-json
   */
  html: string;

  /**
   * The ID of the annotation that this comment is replying to, if any.
   */
  replyTo?: string;
}

/**
 * Saves the given data to a file record and returns the file annotation data.
 * @param recordName The name of the record.
 * @param data The data that should be saved.
 */
export async function saveFileAnnotationData(
  recordName: string,
  data: unknown
): Promise<string> {
  const result = await os.recordFile(recordName, data, {
    marker: "publicRead",
  });

  if (result.success === false) {
    if (result.errorCode === "file_already_exists") {
      return result.existingFileUrl;
    }

    console.error("Error saving file annotation data: ", result);
    throw new Error(`Error saving file annotation data: ${result.errorCode}`);
  }

  return result.url;
  return {
    url: result.url,
  };
}

/**
 * Creates a new annotation object.
 * @param bookId The ID of the book that the annotation is for.
 * @param chapterNumber The chapter number that the annotation is for.
 * @param data The data of the annotation.
 * @returns The created annotation object.
 */
export function createAnnotation(
  bookId: string,
  chapterNumber: number,
  data: AnnotationData,
  verseNumber: number
): Annotation {
  data = COMMENT_SCHEMA.parse(data);
  let keyName = 'verseNumber';
  if(Array.isArray(verseNumber)) {
    keyName = 'verseNumbers';
  }
  return {
    id: uuid(),
    bookId,
    [keyName]: verseNumber,
    chapterNumber,
    data,
  };
}

/**
 * Gets the marker that is used for annotation data.
 * @param bookId
 * @param chapterNumber
 * @returns
 */
export function getAnnotationMarker(
  bookId: string,
  chapterNumber: number,
  group: string = "annotations"
): string {
  return `publicRead:${group}/${bookId}/${chapterNumber}`;
}

/**
 * Gets the record that should be used for annotations.
 * @param forceLogin Whether to force the user to log in if they are not already logged in.
 */
export async function getAnnotationRecord(forceLogin?: boolean) {
  const injectedRecordKey = configBot.tags.annotationRecordKey;
  if (injectedRecordKey) {
    return injectedRecordKey;
  }
  return await getUserRecord(forceLogin);
}

/**
 * Gets the user's record name.
 *
 * Returns null if the user isn't logged in or refuses to login.
 *
 * @param forceLogin If true, the user will be prompted to log in if they are not already logged in.
 */
export async function getUserRecord(
  forceLogin?: boolean
): Promise<string | null> {
  const authBot = forceLogin
    ? await os.requestAuthBot()
    : await os.requestAuthBotInBackground();

  if (!authBot) {
    return null;
  }

  return authBot.id;
}

/**
 * Saves an annotation to a record.
 * @param recordName The name of the record that the annotation should be saved in.
 * @param annotation The annotation to save.
 * @param group An optional group to use for the annotations. Group can be used store different collections of annotations inside a single record.
 *
 * @example Save a new annotation for Genesis chapter 1
 * const annotation = createAnnotation('GEN', 1, {
 *   text: 'These are my notes'
 * });
 *
 * await saveAnnotation('my-annotations-record', annotation);
 *
 * @example Save a new file annotation
 * const fileData = await saveFileAnnotationData('my-annotations-record', dataToSave);
 * const annotation = createAnnotation('GEN', 1, {
 *    fileType: 'audio',
 *    file: fileData
 * });
 *
 * await saveAnnotation('my-annotations-record', annotation);
 */
export async function saveAnnotation(
  recordName: string,
  annotation: Annotation,
  group?: string
): Promise<void> {
  const data = ANNOTATION_SCHEMA.parse(annotation);
  const marker = getAnnotationMarker(data.bookId, data.chapterNumber, group);

  const result = await os.recordData(recordName, data.id, data, {
    marker,
  });

  if (result.success === false) {
    console.error("Error saving annotation: ", result);
    throw new Error("Error saving annotation");
  }
}

/**
 * Deletes the given annotation from a record.
 * @param recordName The name of the record that the annotation is stored in.
 * @param annotation The annotation to delete.
 */
export async function deleteAnnotation(
  recordName: string,
  annotation: Annotation
): Promise<void> {
  if (typeof annotation.data === "object" && "url" in annotation.data) {
    const result = await os.eraseFile(recordName, annotation.data.url);
    if (result.success === false) {
      console.error("Error deleting annotation file: ", result);
      throw new Error("Error deleting annotation file");
    }
  }

  const result = await os.eraseData(recordName, annotation.id);
  if (result.success === false) {
    console.error("Error deleting annotation: ", result);
    throw new Error("Error deleting annotation");
  }
  return result;
}

/**
 * Gets a single annotation by its ID.
 * @param recordName The name of the record.
 * @param annotationId The ID of the annotation to retrieve.
 */
export async function getAnnotation(
  recordName: string,
  annotationId: string
): Promise<Annotation | null> {
  const result = await os.getData(recordName, annotationId);

  if (result.success === false) {
    if (result.errorCode === "data_not_found") {
      return null;
    } else {
      console.error("Error getting annotation: ", result);
      return null;
    }
  }

  return result.data as Annotation;
}

/**
 * Loads the annotations that are recorded for a specific book and chapter.
 * @param recordName The name of the record that the annotations are stored in.
 * @param bookId The ID of the book that the annotations are for.
 * @param chapterNumber The chapter number that the annotations are for.
 * @param group An optional group to use for the annotations. Group can be used store different collections of annotations inside a single record.
 *
 * @example Load annotations for Genesis chapter 1
 * const annotations = await loadAnnotations('my-annotations-record', 'GEN', 1);
 */
export async function loadAnnotations(
  recordName: string,
  bookId: string,
  chapterNumber: number,
  group?: string
): Promise<Annotation[]> {
  const marker = getAnnotationMarker(bookId, chapterNumber, group);

  const annotations: Annotation[] = [];
  let lastAddress: string | null = null;
  while (true) {
    const dataRecords = await os.listDataByMarker(
      recordName,
      marker,
      lastAddress
    );

    if (dataRecords.success === false) {
      console.error("Error loading annotations: ", dataRecords);
      throw new Error("Error loading annotations");
    }

    const items = dataRecords.items;
    if (items.length === 0) {
      break;
    }
    annotations.push(...items.map((i) => i.data));
    lastAddress = items[items.length - 1].address;
  }

  return annotations.sort((a, b) => {
    if (typeof a.order === "number") {
      if (typeof b.order === "number") {
        return a.order - b.order;
      } else {
        // All annotations with an order come before
        // ones that don't have an order
        return -1;
      }
    } else if (typeof b.order === "number") {
      // All annotations with an order come before
      // ones that don't have an order
      return 1;
    } else {
      return a.id < b.id ? -1 : 1;
    }
  });
}

// load translation document
/**
 * Loads a translation document for the given book ID and chapter number.
 *
 * Translation documents can be used with tiptap to allow users to edit the text content of a chapter and share it
 * in realtime with other users.
 *
 * Note that each translation document has a realtime connection to the server, so try to limit how many
 * translation documents are open at once. Use `doc.unsubscribe()` to disconnect the document from the server.
 *
 * @param recordName The name of the record that the translation document is stored in.
 * @param bookId The ID of the book.
 * @param chapterNumber The number of the chapter.
 * @param group An optional group to use for the translation documents. Groups can be used store different collections of translation documents inside a single record.
 * @returns A shared document.
 *
 * @example Load a translation document Genesis chapter 1
 * const doc = await loadTranslationDocument('my-annotations-record', 'GEN', 1);
 *
 * @example Unload a translation document
 * doc.unsubscribe();
 */
export async function loadTranslationDocument(
  recordName: string,
  bookId: string,
  chapterNumber: number,
  group: string = "translation_documents"
): Promise<SharedDocument> {
  const marker = `publicRead:${group}/${bookId}/${chapterNumber}`;
  const doc = await os.getSharedDocument(
    recordName,
    group,
    `${bookId}/${chapterNumber}`,
    {
      markers: [marker],
    }
  );
  return doc;
}

// Reading History
// =======
// shared document - record: <user record>/<studio record>, inst: reading_history, branch: <current year utc>
// stores reading events

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

/**
 * Gets the reading history document for the given record name and year.
 * @param recordName The name of the record that the reading history is stored in.
 * @param year The year to get the reading history for.
 * @param marker The marker to use for the reading history document. Use `publicRead` to allow anyone to read, but only users who have access to the record can write. Use `publicWrite` to allow anyone to write. Defaults to `publicRead`.
 * @param name The name of the shared document. Defaults to `reading_history`.
 * @returns A promise that resolves to the reading history document.
 */
export function getReadingHistoryDocument(
  recordName: string,
  year: number,
  marker: string = "publicRead",
  name: string = "reading_history"
): Promise<SharedDocument> {
  if (!bot.vars.readingHistoryDocs) {
    bot.vars.readingHistoryDocs = {};
  }
  const key = `${recordName}-${name}-${year}`;
  if (bot.vars.readingHistoryDocs[key]) {
    return bot.vars.readingHistoryDocs[key];
  }

  const markers = [`${marker}:${name}/${year}`];
  const docPromise = (bot.vars.readingHistoryDocs[key] = os.getSharedDocument(
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
 * Saves the user's reading history for the given book and chapter.
 * @param bookId The ID of the book.
 * @param chapter The chapter number.
 * @param recencyThresholdSeconds The time in seconds to consider an event recent. Defaults to 30 minutes.
 */
export async function saveUserReadingHistory(
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
    authBot.id,
    authBot.id,
    bookId,
    chapter,
    recencyThresholdSeconds
  );
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
    recordName,
    currentYear,
    marker,
    name
  );
  const recencyThreshold = currentTimeSeconds - recencyThresholdSeconds;
  const array = doc.getArray("events");
  const event = findMostRecentReadingEvent(
    array,
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
  startTime: number,
  endTime: number
): Promise<ReadingHistorySummary> {
  const authBot = await os.requestAuthBotInBackground();

  if (!authBot) {
    // User is not logged in, so we can't get reading history
    return null;
  }

  return getReadingHistorySummary(authBot.id, startTime, endTime);
}

/**
 * Calculates the reading history summary for the given record name and time range.
 * @param recordName The name of the record that the reading history is stored in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to the reading history summary.
 */
export async function getReadingHistorySummary(
  recordName: string,
  startTime: number,
  endTime: number
): Promise<ReadingHistorySummary> {
  const events = await getReadingHistoryEvents(recordName, startTime, endTime);
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
  recordName: string,
  startTime: number,
  endTime: number
): Promise<Iterable<ReadingEvent>> {
  const startYear = new Date(startTime * 1000).getUTCFullYear();
  const endYear = new Date(endTime * 1000).getUTCFullYear();
  const allEventPromises: Promise<Iterable<ReadingEvent>>[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const events = getYearlyReadingHistoryEvents(
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
 * Gets a summary of the reading history for the given record name.
 * @param recordName The name of the record that the reading history is stored in.
 * @param year The year to get the reading history summary for.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @param marker The marker to use for the reading history document. Use `publicRead` to allow anyone to read, but only users who have access to the record can write. Use `publicWrite` to allow anyone to write. Defaults to `publicRead`.
 * @param name The name of the shared document. Defaults to `reading_history`.
 * @returns A promise that resolves to the reading history summary.
 */
async function getYearlyReadingHistorySummary(
  recordName: string,
  year: number,
  startTime: number,
  endTime: number,
  marker?: string,
  name?: string
): Promise<any> {
  const events = await getYearlyReadingHistoryEvents(
    recordName,
    year,
    startTime,
    endTime,
    marker,
    name
  );
  return calculateReadingHistorySummary(events);
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
  recordName: string,
  year: number,
  startTime: number,
  endTime: number,
  marker?: string,
  name?: string
): Promise<Iterable<ReadingEvent>> {
  const doc = await getReadingHistoryDocument(recordName, year, marker, name);
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
  const eventsArray = doc.getArray("events").type;

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
    for (const bookId in user.books) {
      const book = user.books[bookId];
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
  events: SharedArray<SharedMap<any>>,
  userId: string,
  bookId: string,
  chapter: number,
  oldestTime: number
): ReadingEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
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
