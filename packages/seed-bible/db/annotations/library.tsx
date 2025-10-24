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
     * The data of the annotation.
     */
    data: unknown;

    /**
     * The optional sort order of the annotation.
     */
    order?: number;
}

/**
 * Data for an annotation that is stored in a file record.
 */
export interface FileAnnotationData {

    /**
     * The URL of the file record.
     */
    url: string;
}

/**
 * Saves the given data to a file record and returns the file annotation data.
 * @param recordName The name of the record.
 * @param data The data that should be saved.
 */
export async function saveFileAnnotationData(recordName: string, data: unknown): Promise<FileAnnotationData> {
    const result = await os.recordFile(recordName, data, {
        marker: 'publicRead'
    });

    if (result.success === false) {
        if (result.errorCode === 'file_already_exists') {
            return {
                url: result.existingFileUrl
            };
        }

        console.error("Error saving file annotation data: ", result);
        throw new Error(`Error saving file annotation data: ${result.errorCode}`);
    }

    return {
        url: result.url
    };
}

/**
 * Creates a new annotation object.
 * @param bookId The ID of the book that the annotation is for.
 * @param chapterNumber The chapter number that the annotation is for.
 * @param data The data of the annotation.
 * @returns The created annotation object.
 */
export function createAnnotation(bookId: string, chapterNumber: number, data: unknown): Annotation {
    return {
        id: uuid(),
        bookId,
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
export function getAnnotationMarker(bookId: string, chapterNumber: number, group: string = 'annotations'): string {
    return `publicRead:${group}/${bookId}/${chapterNumber}`;
}

/**
 * Gets the user's record name.
 * 
 * Returns null if the user isn't logged in or refuses to login.
 * 
 * @param forceLogin If true, the user will be prompted to log in if they are not already logged in.
 */
export async function getUserRecord(forceLogin?: boolean): Promise<string | null> {
    const authBot = forceLogin ? await os.requestAuthBot() : await os.requestAuthBotInBackground();

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
export async function saveAnnotation(recordName: string, annotation: Annotation, group?: string): Promise<void> {
    const marker = getAnnotationMarker(annotation.bookId, annotation.chapterNumber, group);

    const result = await os.recordData(recordName, annotation.id, annotation, {
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
export async function deleteAnnotation(recordName: string, annotation: Annotation): Promise<void> {
    if (typeof annotation.data === 'object' && 'url' in annotation.data) {
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
}

/**
 * Gets a single annotation by its ID.
 * @param recordName The name of the record.
 * @param annotationId The ID of the annotation to retrieve.
 */
export async function getAnnotation(recordName: string, annotationId: string): Promise<Annotation | null> {
    const result = await os.getData(recordName, annotationId);

    if (result.success === false) {
        if (result.errorCode === 'data_not_found') {
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
export async function loadAnnotations(recordName: string, bookId: string, chapterNumber: number, group?: string): Promise<Annotation[]> {
    const marker = getAnnotationMarker(bookId, chapterNumber, group);

    const annotations: Annotation[] = [];
    let lastAddress: string | null = null;
    while(true) {
        const dataRecords = await os.listDataByMarker(recordName, marker, lastAddress);

        if (dataRecords.success === false) {
            console.error("Error loading annotations: ", dataRecords);
            throw new Error("Error loading annotations");
        }

        const items = dataRecords.items;
        if (items.length === 0) {
            break;
        }
        annotations.push(...items.map(i => i.data));
        lastAddress = items[items.length - 1].address;
    }

    return annotations.sort((a, b) => {
        if (typeof a.order === 'number') {
            if (typeof b.order === 'number') {
                return a.order - b.order;
            } else {
                // All annotations with an order come before
                // ones that don't have an order
                return -1;
            }
        } else if (typeof b.order === 'number') {
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
export async function loadTranslationDocument(recordName: string, bookId: string, chapterNumber: number, group: string = 'translation_documents'): Promise<SharedDocument> {
    const marker = `publicRead:${group}/${bookId}/${chapterNumber}`;
    const doc = await os.getSharedDocument(recordName, group, `${bookId}/${chapterNumber}`, {
        markers: [marker]
    });
    return doc;
}


// Reading History
// =======
// shared document - record: <user record>/<studio record>, inst: reading_history, branch: <current year utc>
// stores reading events

interface ReadingEvent {
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
 * @returns A promise that resolves to the reading history document.
 */
export function getReadingHistoryDocument(recordName: string, year: number): Promise<SharedDocument> {
    if (!bot.vars.readingHistoryDocs) {
        bot.vars.readingHistoryDocs = {};
    }
    const key = `${recordName}-${year}`;
    if (bot.vars.readingHistoryDocs[key]) {
        return bot.vars.readingHistoryDocs[key];
    }

    const marker = `publicRead:reading_history/${year}`;
    const docPromise = bot.vars.readingHistoryDocs[key] = os.getSharedDocument(recordName, 'reading_history', `${year}`, {
        markers: [marker]
    });
    return docPromise;
}

/**
 * Saves the user's reading history for the given book and chapter.
 * @param bookId The ID of the book.
 * @param chapter The chapter number.
 * @param recencyThresholdSeconds The time in seconds to consider an event recent. Defaults to 30 minutes.
 */
export async function saveUserReadingHistory(bookId: string, chapter: number, recencyThresholdSeconds: number = 30 * 60): Promise<void> {
    const authBot = await os.requestAuthBotInBackground();

    if (!authBot) {
        // User is not logged in, so we can't save reading history
        return;
    }

    await saveReadingHistory(authBot.id, authBot.id, bookId, chapter, recencyThresholdSeconds);
}

/**
 * Saves a reading history event.
 * If the user has already read the chapter within the last 30 minutes, then end time of the event will be updated instead of creating a new event.
 * @param userId The ID of the user that the event is for.
 * @param bookId The ID of the book that the event is for.
 * @param chapter The chapter number that was read.
 * @param recencyThresholdSeconds The time in seconds to consider an event recent. Defaults to 30 minutes.
 */
export async function saveReadingHistory(recordName: string, userId: string, bookId: string, chapter: number, recencyThresholdSeconds: number = 30 * 60): Promise<void> {
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    const currentYear = new Date().getUTCFullYear();

    const doc = await getReadingHistoryDocument(recordName, currentYear);

    const recencyThreshold = currentTimeSeconds - recencyThresholdSeconds;
    const array = doc.getArray<ReadingEvent>('events');
    const event = findMostRecentReadingEvent(array, userId, bookId, chapter, recencyThreshold);
    const now = Math.floor(Date.now() / 1000);
    if (event) {
        event.set('end', now);
    } else {
        const newEvent = doc.createMap();
        newEvent.set('userId', userId);
        newEvent.set('bookId', bookId);
        newEvent.set('chapter', chapter);
        newEvent.set('start', now);
        newEvent.set('end', now);
        array.push(newEvent);
    }
}

/**
 * An interface representing a summary of reading history.
 */
export interface ReadingHistorySummary {
    /**
     * The total number of books that were read over the time period.
     */
    uniqueBooksRead: number;

    /**
     * The total number of chapters that were read over the time period.
     */
    uniqueChaptersRead: number;

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
             * The total number of books that the user read over the time period.
             */
            uniqueBooksRead: number;

            /**
             * The total number of chapters that the user read over the time period.
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
                    }
                }
            }
        }
    }

    /**
     * The start time in unix seconds of the summary.
     */
    startTime: number;

    /**
     * The end time in unix seconds of the summary.
     */
    endTime: number;
}

/**
 * Gets the reading history summary for today for the given record name.
 * @param recordName 
 * @returns 
 */
export async function getTodaysReadingHistorySummary(recordName: string): Promise<ReadingHistorySummary> {
    const now = new Date();
    const startOfDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
    const endOfDay = startOfDay + 86400 - 1; // End of day in unix seconds

    return getReadingHistorySummary(recordName, startOfDay, endOfDay);
}

/**
 * Calculates the reading history summary for the given record name and time range.
 * @param recordName The name of the record that the reading history is stored in.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 * @returns A promise that resolves to the reading history summary.
 */
export async function getReadingHistorySummary(recordName: string, startTime: number, endTime: number): Promise<ReadingHistorySummary> {
    const startYear = new Date(startTime * 1000).getUTCFullYear();
    const endYear = new Date(endTime * 1000).getUTCFullYear();

    const overallSummary: ReadingHistorySummary = {
        uniqueBooksRead: 0,
        uniqueChaptersRead: 0,
        totalTimeSpentReading: 0,
        users: {},
        startTime,
        endTime,
    };

    const allYearsPromises: Promise<ReadingHistorySummary>[] = [];
    for(let y = startYear; y <= endYear; y++) {
        const yearlySummary = getYearlyReadingHistorySummary(recordName, y, startTime, endTime);
        allYearsPromises.push(yearlySummary);
    }

    const allYears = await Promise.all(allYearsPromises);

    if (allYears.length === 0) {
        return overallSummary;
    } else if(allYears.length === 1) {
        return allYears[0];
    }
    // Merge the yearly summaries into the overall summary
    for(const yearlySummary of allYears) {
        for(const userId in yearlySummary.users) {
            const yearlyUser = yearlySummary.users[userId];

            if(!overallSummary.users[userId]) {
                overallSummary.users[userId] = { ...yearlyUser };
            } else {
                const overallUser = overallSummary.users[userId];

                for(const bookId in yearlyUser.books) {
                    const yearlyBook = yearlyUser.books[bookId];

                    if (!overallUser.books[bookId]) {
                        overallUser.books[bookId] = { ...yearlyBook };
                    } else {
                        const overallBook = overallUser.books[bookId];

                        for(const chapterNumber in yearlyBook.chapters) {
                            const yearlyChapterEvents = yearlyBook.chapters[chapterNumber];

                            if (!overallBook.chapters[chapterNumber]) {
                                overallBook.chapters[chapterNumber] = yearlyChapterEvents.slice();
                            } else {
                                const overallChapterEvents = overallBook.chapters[chapterNumber];
                                overallChapterEvents.push(...yearlyChapterEvents);
                            }
                        }
                    }
                }
            }
        }
    }

    updateSummaryTotals(overallSummary);
    
    return overallSummary;
}

/**
 * Gets a summary of the reading history for the given record name.
 * @param recordName The name of the record that the reading history is stored in.
 * @param year The year to get the reading history summary for.
 * @param startTime The start time in unix seconds to filter the reading history events.
 * @param endTime The end time in unix seconds to filter the reading history events.
 */
async function getYearlyReadingHistorySummary(recordName: string, year: number, startTime: number, endTime: number): Promise<any> {
    let summary: ReadingHistorySummary = {
        uniqueBooksRead: 0,
        uniqueChaptersRead: 0,
        totalTimeSpentReading: 0,
        users: {}
    };

    const doc = await getReadingHistoryDocument(recordName, year);
    const eventsArray = doc.getArray<SharedMap<any>>('events');
    
    for(let i = 0; i < eventsArray.length; i++) {
        const e: SharedMap<any> = eventsArray.get(i);
        const event: ReadingEvent = {
            userId: e.get('userId'),
            bookId: e.get('bookId'),
            chapter: e.get('chapter'),
            start: e.get('start'),
            end: e.get('end'),
        };

        // Skip events outside the specified time range
        // Only consider start time for filtering to avoid skipping time sections
        if (event.start < startTime || event.start > endTime) {
            continue;
        }

        const length = event.end - event.start;
        summary.totalTimeSpentReading += length;
        const userSummary = (summary.users[event.userId] ??= {
            uniqueBooksRead: 0,
            uniqueChaptersRead: 0,
            totalTimeSpentReading: 0,
            books: {}
        });

        userSummary.totalTimeSpentReading += length;
        const bookSummary = (userSummary.books[event.bookId] ??= {
            uniqueChaptersRead: 0,
            totalTimeSpentReading: 0,
            chapters: {}
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
            summary.uniqueBooksRead += 1;
            summary.uniqueChaptersRead += Object.keys(book.chapters).length;
        }
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
function findMostRecentReadingEvent(events: SharedArray<SharedMap<any>>, userId: string, bookId: string, chapter: number, oldestTime: number): ReadingEvent | null {
    for(let i = events.length - 1; i >= 0; i--) {
        const event: SharedMap<any> = events.get(i);
        if (event.get('userId') === userId && event.get('bookId') === bookId && event.get('chapter') === chapter) {
            return event;
        } else if (event.get('end') < oldestTime) {
            break;
        }
    }
    return null;
}