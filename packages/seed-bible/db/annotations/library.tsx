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
 * Stores all verse highlights for a single chapter.
 */
export type ChapterHighlights = z.infer<typeof CHAPTER_HIGHLIGHTS_SCHEMA>;

export const CHAPTER_HIGHLIGHTS_SCHEMA = z.object({
  translation: z.string(),
  bookId: z.string(),
  chapter: z.number(),
  verses: z.record(z.number(), z.tuple([z.number(), z.string()])),
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
  verseNumber: number | number[]
): Annotation {
  data = COMMENT_SCHEMA.parse(data);
  let keyName = "verseNumber";
  if (Array.isArray(verseNumber)) {
    keyName = "verseNumbers";
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

/**
 * Gets the address for chapter highlights.
 * @param translation The translation ID.
 * @param bookId The book ID.
 * @param chapter The chapter number.
 * @returns The data address for the chapter highlights.
 */
export function getChapterHighlightsAddress(
  translation: string,
  bookId: string,
  chapter: number
): string {
  return `${translation}/${bookId}/${chapter}`;
}

/**
 * Saves chapter highlights in a single data record.
 *
 * Uses marker `publicRead:highlights` and address `<translation>/<bookId>/<chapter>`.
 * @param recordName The record name to save to.
 * @param highlights The chapter highlights to save.
 */
export async function saveChapterHighlights(
  recordName: string,
  highlights: ChapterHighlights
): Promise<void> {
  const data = CHAPTER_HIGHLIGHTS_SCHEMA.parse(highlights);
  const address = getChapterHighlightsAddress(
    data.translation,
    data.bookId,
    data.chapter
  );

  const result = await os.recordData(recordName, address, data, {
    markers: [
      "publicRead:highlights",
      `publicRead:highlights/${data.translation}`,
    ],
  });

  if (result.success === false) {
    console.error("Error saving chapter highlights: ", result);
    throw new Error("Error saving chapter highlights");
  }
}

/**
 * Loads chapter highlights from a single data record.
 *
 * Uses marker `publicRead:highlights` and address `<translation>/<bookId>/<chapter>`.
 * @param recordName The record name to load from.
 * @param translation The translation ID.
 * @param bookId The book ID.
 * @param chapter The chapter number.
 * @returns The chapter highlights, or null if not found.
 */
export async function loadChapterHighlights(
  recordName: string,
  translation: string,
  bookId: string,
  chapter: number
): Promise<ChapterHighlights | null> {
  const address = getChapterHighlightsAddress(translation, bookId, chapter);
  const result = await os.getData(recordName, address);

  if (result.success === false) {
    if (result.errorCode === "data_not_found") {
      return null;
    }

    console.error("Error loading chapter highlights: ", result);
    throw new Error("Error loading chapter highlights");
  }

  return CHAPTER_HIGHLIGHTS_SCHEMA.parse(result.data);
}

/**
 * A stateful manager for chapter verse highlights.
 *
 * Caches chapter highlights in memory after they are loaded.
 */
export class HighlightsManager {
  private _cache = new Map<string, ChapterHighlights>();

  private _recordName: string;

  constructor(recordName: string) {
    this._recordName = recordName;
  }

  private _address(
    translation: string,
    bookId: string,
    chapter: number
  ): string {
    return getChapterHighlightsAddress(translation, bookId, chapter);
  }

  private _createEmptyChapterHighlights(
    translation: string,
    bookId: string,
    chapter: number
  ): ChapterHighlights {
    return {
      translation,
      bookId,
      chapter,
      verses: {},
    };
  }

  /**
   * Loads chapter highlights and caches them.
   *
   * If no highlights exist yet, an empty chapter highlights object is returned and cached.
   */
  async loadChapterHighlights(
    translation: string,
    bookId: string,
    chapter: number
  ): Promise<ChapterHighlights> {
    const address = this._address(translation, bookId, chapter);
    const cached = this._cache.get(address);
    if (cached) {
      return cached;
    }

    const loaded = await loadChapterHighlights(
      this._recordName,
      translation,
      bookId,
      chapter
    );
    const highlights =
      loaded ??
      this._createEmptyChapterHighlights(translation, bookId, chapter);

    this._cache.set(address, highlights);
    return highlights;
  }

  /**
   * Saves chapter highlights and updates the local cache.
   */
  async saveChapterHighlights(highlights: ChapterHighlights): Promise<void> {
    await saveChapterHighlights(this._recordName, highlights);
    const address = this._address(
      highlights.translation,
      highlights.bookId,
      highlights.chapter
    );
    this._cache.set(address, highlights);
  }

  /**
   * Adds or updates a single verse highlight and persists the chapter record.
   */
  async addVerseHighlight(
    translation: string,
    bookId: string,
    chapter: number,
    verse: number,
    color: string,
    timeMs: number = Date.now()
  ): Promise<ChapterHighlights> {
    return this.addVerseHighlights(
      translation,
      bookId,
      chapter,
      [verse],
      color,
      timeMs
    );
  }

  /**
   * Adds or updates multiple verse highlights and persists the chapter record.
   *
   * Applies the same color and time to each verse in the provided array.
   */
  async addVerseHighlights(
    translation: string,
    bookId: string,
    chapter: number,
    verses: number[],
    color: string,
    timeMs: number = Date.now()
  ): Promise<ChapterHighlights> {
    const chapterHighlights = await this.loadChapterHighlights(
      translation,
      bookId,
      chapter
    );

    for (const verse of verses) {
      chapterHighlights.verses[verse] = [timeMs, color];
    }

    await this.saveChapterHighlights(chapterHighlights);
    return chapterHighlights;
  }

  /**
   * Removes a verse highlight and persists the chapter record.
   */
  async removeVerseHighlight(
    translation: string,
    bookId: string,
    chapter: number,
    verse: number
  ): Promise<ChapterHighlights> {
    return this.removeVerseHighlights(translation, bookId, chapter, [verse]);
  }

  /**
   * Removes multiple verse highlights and persists the chapter record.
   */
  async removeVerseHighlights(
    translation: string,
    bookId: string,
    chapter: number,
    verses: number[]
  ): Promise<ChapterHighlights> {
    const chapterHighlights = await this.loadChapterHighlights(
      translation,
      bookId,
      chapter
    );

    for (const verse of verses) {
      delete chapterHighlights.verses[verse];
    }

    await this.saveChapterHighlights(chapterHighlights);
    return chapterHighlights;
  }

  /**
   * Gets chapter highlights from cache if available.
   */
  getCachedChapterHighlights(
    translation: string,
    bookId: string,
    chapter: number
  ): ChapterHighlights | null {
    return this._cache.get(this._address(translation, bookId, chapter)) ?? null;
  }

  /**
   * Clears all cached chapter highlights.
   */
  clearCache(): void {
    this._cache.clear();
  }
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

// User Subscriptions
// =======

/**
 * Represents a subscribed user with their details.
 */
export interface SubscribedUser {
  id: string;
  name?: string;
  photoLink?: string;
}

/**
 * Adds users to the current user's subscription list.
 * This appends new users to the existing subscriptions without removing previous ones.
 * Also adds the current user to each target user's subscribers list.
 * @param users The array of users to subscribe to (with id, name, and photoLink).
 * @returns A promise that resolves when the subscription is saved, or null if the user is not logged in.
 */
export async function subscribeToUsers(
  users: SubscribedUser[]
): Promise<void | null> {
  const recordName = await getUserRecord(true);

  if (!recordName) {
    return null;
  }

  // Get existing subscriptions and merge with new ones
  const existingUsers = await getUserSubscriptionsWithDetails(recordName);
  const existingIds = new Set(existingUsers.map((u) => u.id));
  const newUsers = users.filter((u) => !existingIds.has(u.id));
  const mergedUsers = [...existingUsers, ...newUsers];

  // Save my subscriptions
  await saveUserSubscriptions(recordName, mergedUsers);

  // Get current user's profile data to add to target users' subscribers list
  const myProfileResult = await os.getData(recordName, recordName);
  const myProfile = {
    id: recordName,
    name: myProfileResult.success ? myProfileResult.data?.name : undefined,
    photoLink: myProfileResult.success
      ? myProfileResult.data?.photoLink
      : undefined,
  };

  // Add myself to each new user's subscribers list
  for (const user of newUsers) {
    try {
      await addSubscriberToUser(user.id, myProfile);
      // Notify that user subscribed
      shout("userSubscribed", {
        subscriber: myProfile,
        subscribedTo: user,
        configId: configBot.id,
      });
    } catch (e) {
      console.error(`Error adding subscriber to user ${user.id}:`, e);
    }
  }
}

/**
 * Adds a subscriber to a user's subscribers list.
 * @param targetUserId The user ID to add the subscriber to.
 * @param subscriber The subscriber to add.
 */
async function addSubscriberToUser(
  targetUserId: string,
  subscriber: SubscribedUser
): Promise<void> {
  const existingSubscribers = await getSubscribersOfUser(targetUserId);
  const alreadyExists = existingSubscribers.some((s) => s.id === subscriber.id);

  if (!alreadyExists) {
    const updatedSubscribers = [...existingSubscribers, subscriber];
    await saveSubscribers(targetUserId, updatedSubscribers);
  }
}

/**
 * Removes a subscriber from a user's subscribers list.
 * @param targetUserId The user ID to remove the subscriber from.
 * @param subscriberId The subscriber ID to remove.
 */
async function removeSubscriberFromUser(
  targetUserId: string,
  subscriberId: string
): Promise<void> {
  const existingSubscribers = await getSubscribersOfUser(targetUserId);
  const updatedSubscribers = existingSubscribers.filter(
    (s) => s.id !== subscriberId
  );
  await saveSubscribers(targetUserId, updatedSubscribers);
}

/**
 * Saves the subscribers list for a user.
 * @param recordName The user's record name.
 * @param subscribers The list of subscribers.
 */
async function saveSubscribers(
  recordName: string,
  subscribers: SubscribedUser[]
): Promise<void> {
  const result = await os.recordData(
    recordName,
    "user_subscribers",
    { subscribers },
    {
      marker: "publicRead:subscribers",
    }
  );

  if (result.success === false) {
    console.error("Error saving subscribers: ", result);
  }
}

/**
 * Gets the subscribers of a specific user.
 * @param recordName The user's record name.
 * @returns Array of subscribers.
 */
async function getSubscribersOfUser(
  recordName: string
): Promise<SubscribedUser[]> {
  const result = await os.getData(recordName, "user_subscribers");

  if (result.success === false) {
    if (result.errorCode === "data_not_found") {
      return [];
    }
    console.error("Error getting subscribers: ", result);
    return [];
  }

  const data = result.data as { subscribers?: SubscribedUser[] };
  return data.subscribers || [];
}

/**
 * Gets all users who are subscribed to the current user.
 * @returns Array of subscribers, or null if not logged in.
 */
export async function getMySubscribers(): Promise<SubscribedUser[] | null> {
  const recordName = await getUserRecord(false);

  if (!recordName) {
    return null;
  }

  return getSubscribersOfUser(recordName);
}

/**
 * Removes users from the current user's subscription list.
 * Also removes the current user from each target user's subscribers list.
 * @param userIds The array of user IDs to unsubscribe from.
 * @returns A promise that resolves when the subscription is saved, or null if the user is not logged in.
 */
export async function unsubscribeFromUsers(
  userIds: string[]
): Promise<void | null> {
  const recordName = await getUserRecord(true);

  if (!recordName) {
    return null;
  }

  const existingUsers = await getUserSubscriptionsWithDetails(recordName);
  const filteredUsers = existingUsers.filter((u) => !userIds.includes(u.id));

  // Save my updated subscriptions
  await saveUserSubscriptions(recordName, filteredUsers);

  // Remove myself from each user's subscribers list
  for (const userId of userIds) {
    try {
      await removeSubscriberFromUser(userId, recordName);
      // Notify that user unsubscribed
      shout("userUnsubscribed", {
        unsubscriberId: recordName,
        unsubscribedFromId: userId,
        configId: configBot.id,
      });
    } catch (e) {
      console.error(`Error removing subscriber from user ${userId}:`, e);
    }
  }
}

/**
 * Replaces the current user's entire subscription list.
 * Warning: This will remove all existing subscriptions and replace them with the new list.
 * @param users The array of users to set as subscriptions.
 * @returns A promise that resolves when the subscription is saved, or null if the user is not logged in.
 */
export async function setSubscribedUsers(
  users: SubscribedUser[]
): Promise<void | null> {
  const recordName = await getUserRecord(true);

  if (!recordName) {
    return null;
  }

  return saveUserSubscriptions(recordName, users);
}

/**
 * Saves user subscriptions to a record.
 * @param recordName The name of the record (typically the main user's authBot.id).
 * @param users The array of subscribed users with their details.
 * @param marker The marker to use for the subscription data. Defaults to `publicRead`.
 */
export async function saveUserSubscriptions(
  recordName: string,
  users: SubscribedUser[],
  marker: string = "publicRead"
): Promise<void> {
  const result = await os.recordData(
    recordName,
    "user_subscriptions",
    { users },
    {
      marker: `${marker}:subscriptions`,
    }
  );

  if (result.success === false) {
    console.error("Error saving user subscriptions: ", result);
    throw new Error(`Error saving user subscriptions: ${result.errorCode}`);
  }
}

/**
 * Gets the list of subscribed users with their details for the current user.
 * @returns A promise that resolves to an array of subscribed users, or null if the user is not logged in.
 */
export async function getSubscribedUsers(): Promise<SubscribedUser[] | null> {
  const recordName = await getUserRecord(false);

  if (!recordName) {
    return null;
  }

  return getUserSubscriptionsWithDetails(recordName);
}

/**
 * Gets the list of subscribed users with their details from a record.
 * @param recordName The name of the record to get subscriptions from.
 * @returns A promise that resolves to an array of subscribed users.
 */
export async function getUserSubscriptionsWithDetails(
  recordName: string
): Promise<SubscribedUser[]> {
  const result = await os.getData(recordName, "user_subscriptions");

  if (result.success === false) {
    if (result.errorCode === "data_not_found") {
      return [];
    }
    console.error("Error getting user subscriptions: ", result);
    return [];
  }

  // Support both old format (userIds array) and new format (users array)
  const data = result.data as { users?: SubscribedUser[]; userIds?: string[] };
  if (data.users) {
    return data.users;
  }
  // Backward compatibility: convert old userIds format to new format
  if (data.userIds) {
    return data.userIds.map((id) => ({ id }));
  }
  return [];
}

/**
 * Gets the list of user IDs that a record is subscribed to.
 * @param recordName The name of the record to get subscriptions from.
 * @returns A promise that resolves to an array of user IDs.
 * @deprecated Use getUserSubscriptionsWithDetails instead for full user details.
 */
export async function getUserSubscriptions(
  recordName: string
): Promise<string[]> {
  const users = await getUserSubscriptionsWithDetails(recordName);
  return users.map((u) => u.id);
}

/**
 * Checks if a specific user is subscribed to the current user.
 * @param userId The user ID to check.
 * @returns A promise that resolves to true if the user is subscribed, false otherwise, or null if not logged in.
 */
export async function isUserSubscribedToMe(
  userId: string
): Promise<boolean | null> {
  const currentUserRecord = await getUserRecord(false);

  if (!currentUserRecord) {
    return null;
  }

  try {
    const userSubs = await getUserSubscriptionsWithDetails(userId);
    return userSubs.some((sub) => sub.id === currentUserRecord);
  } catch (e) {
    console.error(`Error checking if user ${userId} is subscribed:`, e);
    return false;
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
