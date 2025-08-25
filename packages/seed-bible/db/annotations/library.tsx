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
export function getAnnotationMarker(bookId: string, chapterNumber: number): string {
    return `publicRead:annotations/${bookId}/${chapterNumber}`;
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
export async function saveAnnotation(recordName: string, annotation: Annotation): Promise<void> {
    const marker = getAnnotationMarker(annotation.bookId, annotation.chapterNumber);

    const result = await os.recordData(recordName, annotation.id, annotation, {
        marker,
    });

    if (result.success === false) {
        console.error("Error saving annotation: ", result);
        throw new Error("Error saving annotation");
    }
}

/**
 * Loads the annotations that are recorded for a specific book and chapter.
 * @param recordName The name of the record that the annotations are stored in.
 * @param bookId The ID of the book that the annotations are for.
 * @param chapterNumber The chapter number that the annotations are for.
 * 
 * @example Load annotations for Genesis chapter 1
 * const annotations = await loadAnnotations('my-annotations-record', 'GEN', 1);
 */
export async function loadAnnotations(recordName: string, bookId: string, chapterNumber: number): Promise<Annotation[]> {
    const marker = getAnnotationMarker(bookId, chapterNumber);

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
 * @returns A shared document.
 * 
 * @example Load a translation document Genesis chapter 1
 * const doc = await loadTranslationDocument('my-annotations-record', 'GEN', 1);
 * 
 * @example Unload a translation document
 * doc.unsubscribe();
 */
export async function loadTranslationDocument(recordName: string, bookId: string, chapterNumber: number): Promise<SharedDocument> {
    const marker = `publicRead:translation_documents/${bookId}/${chapterNumber}`;
    const doc = await os.getSharedDocument(recordName, 'translation-documents', `${bookId}/${chapterNumber}`, {
        markers: [marker]
    });
    return doc;
}
