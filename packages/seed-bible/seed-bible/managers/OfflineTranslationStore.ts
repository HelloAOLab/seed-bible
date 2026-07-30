/**
 * Storage for translations the user has downloaded to their device.
 *
 * Downloaded translations are far too large for `localStorage` (a complete
 * translation is roughly 7 MB of JSON, and browsers cap `localStorage` at about
 * 5 MB for the whole origin), so they live in IndexedDB instead.
 *
 * Two object stores are used:
 *
 * - `translations` holds one small record per downloaded translation: its
 *   metadata, its book list, and the content hash it was downloaded at.
 * - `chapters` holds one record per chapter, keyed by
 *   `translationId/bookId/chapterNumber`.
 *
 * Splitting chapters into their own records is what keeps reading fast: opening
 * a chapter is a single indexed key lookup, instead of loading and parsing the
 * whole multi-megabyte translation on every navigation.
 *
 * Everything goes through the {@link OfflineTranslationStore} interface so the
 * managers above never touch IndexedDB directly — which is also what lets tests
 * swap in {@link createInMemoryTranslationStore}.
 */

import type {
  ChapterData,
  Translation,
  TranslationBook,
  TranslationBookChapterAudioLinks,
} from "./FreeUseBibleAPI";

export const OFFLINE_DB_NAME = "seed-bible-offline";
export const OFFLINE_DB_VERSION = 1;

const TRANSLATIONS_STORE = "translations";
const CHAPTERS_STORE = "chapters";
const TRANSLATION_ID_INDEX = "translationId";

/**
 * How many chapters are written per IndexedDB transaction while saving a
 * download. Chunking lets us report save progress; one transaction for all
 * ~1,189 chapters would report nothing until it finished.
 */
const SAVE_CHUNK_SIZE = 200;

/**
 * A translation that has been downloaded to this device.
 *
 * Note that `books` are full {@link TranslationBook} records: the complete
 * download does not include the per-chapter API links, so they are synthesized
 * at save time and stored here. That keeps read paths identical to the online
 * ones — callers get the same shape either way.
 */
export interface DownloadedTranslation {
  /** The ID of the downloaded translation. */
  translationId: string;

  /** The API endpoint the translation was downloaded from. */
  endpoint: string;

  /**
   * The content hash reported by the API when the download happened. Compared
   * against the current hash in `available_translations.json` to detect that a
   * newer version exists. Null when the API didn't report one.
   */
  sha256: string | null;

  /** When the download completed, as epoch milliseconds. */
  downloadedAt: number;

  /** Approximate size of the downloaded payload in bytes. */
  sizeBytes: number;

  /** How many chapters were stored. */
  numberOfChapters: number;

  /** The translation's metadata as of the download. */
  translation: Translation;

  /** The translation's books, in canonical order. */
  books: TranslationBook[];
}

/** A single stored chapter's content. */
export interface StoredChapter {
  /** The number of verses in the chapter. */
  numberOfVerses: number;

  /** The audio readings available for the chapter. */
  thisChapterAudioLinks: TranslationBookChapterAudioLinks;

  /** The chapter's number, content, and footnotes. */
  chapter: ChapterData;
}

/** A chapter plus the coordinates it is stored under. */
export interface StoredChapterEntry {
  /** The ID of the book the chapter belongs to. */
  book: string;

  /** The chapter number. */
  chapter: number;

  /** The chapter's content. */
  data: StoredChapter;
}

export interface SaveTranslationOptions {
  /** Called as chapters are written, so callers can show save progress. */
  onProgress?: (savedChapters: number, totalChapters: number) => void;

  /**
   * Aborts the save partway.
   *
   * Chapters are written in chunks, so aborting stops before the next chunk
   * rather than instantly. Whatever was already written is deleted again and the
   * save rejects with an `AbortError`, so a cancelled download never leaves a
   * half-written translation behind.
   */
  signal?: AbortSignal;
}

/** The error a cancelled save rejects with. */
function abortError(): Error {
  const error = new Error("The save was cancelled.");
  error.name = "AbortError";
  return error;
}

/**
 * Persistent storage for downloaded translations.
 */
export interface OfflineTranslationStore {
  /** Lists every downloaded translation. */
  list(): Promise<DownloadedTranslation[]>;

  /** Gets one downloaded translation's metadata, or null if it isn't stored. */
  get(translationId: string): Promise<DownloadedTranslation | null>;

  /** Gets a single stored chapter, or null if it isn't stored. */
  getChapter(
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Promise<StoredChapter | null>;

  /**
   * Replaces any existing copy of the translation with this one.
   *
   * The metadata record is written last on purpose: if the save is interrupted
   * partway, no metadata record exists, so the translation reads back as "not
   * downloaded" rather than as a usable copy with holes in it.
   *
   * Rejects with an `AbortError` if `options.signal` is aborted before the save
   * finishes, having removed the chapters written so far.
   */
  save(
    record: DownloadedTranslation,
    chapters: StoredChapterEntry[],
    options?: SaveTranslationOptions
  ): Promise<void>;

  /** Removes a downloaded translation and all of its chapters. */
  delete(translationId: string): Promise<void>;
}

function chapterKey(
  translationId: string,
  bookId: string,
  chapterNumber: number
): string {
  return `${translationId}/${bookId}/${chapterNumber}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

/** A stored chapter record, i.e. a chapter plus its lookup columns. */
interface ChapterRecord extends StoredChapter {
  key: string;
  translationId: string;
  book: string;
  chapterNumber: number;
}

/**
 * Creates the IndexedDB-backed store.
 *
 * Returns null when IndexedDB is unavailable — during server-side rendering, and
 * in browsers that block storage (private windows in some browsers, or a
 * sandboxed iframe). Callers treat null as "offline downloads aren't supported
 * here" and hide the feature rather than failing.
 */
export function createIndexedDbTranslationStore(): OfflineTranslationStore | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let databasePromise: Promise<IDBDatabase> | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(TRANSLATIONS_STORE)) {
          database.createObjectStore(TRANSLATIONS_STORE, {
            keyPath: "translationId",
          });
        }
        if (!database.objectStoreNames.contains(CHAPTERS_STORE)) {
          const chapters = database.createObjectStore(CHAPTERS_STORE, {
            keyPath: "key",
          });
          chapters.createIndex(TRANSLATION_ID_INDEX, "translationId");
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        // A version change from another tab invalidates this handle; drop the
        // cached promise so the next call reopens instead of using a dead one.
        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };
        resolve(database);
      };

      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open IndexedDB."));
      request.onblocked = () =>
        reject(new Error("IndexedDB upgrade blocked by another tab."));
    }).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });

    return databasePromise;
  };

  const list = async (): Promise<DownloadedTranslation[]> => {
    const database = await openDatabase();
    const transaction = database.transaction(TRANSLATIONS_STORE, "readonly");
    const records = await requestToPromise(
      transaction.objectStore(TRANSLATIONS_STORE).getAll()
    );
    return records as DownloadedTranslation[];
  };

  const get = async (
    translationId: string
  ): Promise<DownloadedTranslation | null> => {
    const database = await openDatabase();
    const transaction = database.transaction(TRANSLATIONS_STORE, "readonly");
    const record = await requestToPromise(
      transaction.objectStore(TRANSLATIONS_STORE).get(translationId)
    );
    return (record as DownloadedTranslation | undefined) ?? null;
  };

  const getChapter = async (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Promise<StoredChapter | null> => {
    const database = await openDatabase();
    const transaction = database.transaction(CHAPTERS_STORE, "readonly");
    const record = await requestToPromise(
      transaction
        .objectStore(CHAPTERS_STORE)
        .get(chapterKey(translationId, bookId, chapterNumber))
    );
    if (!record) {
      return null;
    }
    const { numberOfVerses, thisChapterAudioLinks, chapter } =
      record as ChapterRecord;
    return { numberOfVerses, thisChapterAudioLinks, chapter };
  };

  const deleteTranslation = async (translationId: string): Promise<void> => {
    const database = await openDatabase();
    const transaction = database.transaction(
      [TRANSLATIONS_STORE, CHAPTERS_STORE],
      "readwrite"
    );
    transaction.objectStore(TRANSLATIONS_STORE).delete(translationId);

    const chapters = transaction.objectStore(CHAPTERS_STORE);
    const cursorRequest = chapters
      .index(TRANSLATION_ID_INDEX)
      .openKeyCursor(IDBKeyRange.only(translationId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        return;
      }
      chapters.delete(cursor.primaryKey);
      cursor.continue();
    };

    await transactionToPromise(transaction);
  };

  const save = async (
    record: DownloadedTranslation,
    chapters: StoredChapterEntry[],
    options?: SaveTranslationOptions
  ): Promise<void> => {
    const database = await openDatabase();
    await deleteTranslation(record.translationId);

    // Between chunks is the only safe place to give up: a chunk is one
    // transaction, so it either lands whole or not at all.
    const abortIfCancelled = async () => {
      if (!options?.signal?.aborted) {
        return;
      }
      await deleteTranslation(record.translationId);
      throw abortError();
    };

    await abortIfCancelled();

    for (let index = 0; index < chapters.length; index += SAVE_CHUNK_SIZE) {
      const chunk = chapters.slice(index, index + SAVE_CHUNK_SIZE);
      const transaction = database.transaction(CHAPTERS_STORE, "readwrite");
      const store = transaction.objectStore(CHAPTERS_STORE);
      for (const entry of chunk) {
        const chapterRecord: ChapterRecord = {
          key: chapterKey(record.translationId, entry.book, entry.chapter),
          translationId: record.translationId,
          book: entry.book,
          chapterNumber: entry.chapter,
          numberOfVerses: entry.data.numberOfVerses,
          thisChapterAudioLinks: entry.data.thisChapterAudioLinks,
          chapter: entry.data.chapter,
        };
        store.put(chapterRecord);
      }
      await transactionToPromise(transaction);
      await abortIfCancelled();
      options?.onProgress?.(
        Math.min(index + chunk.length, chapters.length),
        chapters.length
      );
    }

    const metadataTransaction = database.transaction(
      TRANSLATIONS_STORE,
      "readwrite"
    );
    metadataTransaction.objectStore(TRANSLATIONS_STORE).put(record);
    await transactionToPromise(metadataTransaction);
  };

  return {
    list,
    get,
    getChapter,
    save,
    delete: deleteTranslation,
  };
}

/**
 * An in-memory store with the same semantics as the IndexedDB one.
 *
 * Used by tests (jsdom has no IndexedDB) and usable as a fallback in any
 * environment where persistence isn't available but the code paths still need to
 * work.
 */
export function createInMemoryTranslationStore(): OfflineTranslationStore {
  const translations = new Map<string, DownloadedTranslation>();
  const chapters = new Map<string, StoredChapter>();

  const deleteTranslation = async (translationId: string): Promise<void> => {
    translations.delete(translationId);
    const prefix = `${translationId}/`;
    for (const key of [...chapters.keys()]) {
      if (key.startsWith(prefix)) {
        chapters.delete(key);
      }
    }
  };

  return {
    async list() {
      return [...translations.values()];
    },
    async get(translationId) {
      return translations.get(translationId) ?? null;
    },
    async getChapter(translationId, bookId, chapterNumber) {
      return (
        chapters.get(chapterKey(translationId, bookId, chapterNumber)) ?? null
      );
    },
    async save(record, entries, options) {
      await deleteTranslation(record.translationId);
      if (options?.signal?.aborted) {
        throw abortError();
      }
      for (const entry of entries) {
        chapters.set(
          chapterKey(record.translationId, entry.book, entry.chapter),
          entry.data
        );
      }
      if (options?.signal?.aborted) {
        await deleteTranslation(record.translationId);
        throw abortError();
      }
      options?.onProgress?.(entries.length, entries.length);
      translations.set(record.translationId, record);
    },
    delete: deleteTranslation,
  };
}
