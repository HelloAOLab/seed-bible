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
export declare const OFFLINE_DB_NAME = "seed-bible-offline";
export declare const OFFLINE_DB_VERSION = 1;
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
/**
 * Creates the IndexedDB-backed store.
 *
 * Returns null when IndexedDB is unavailable — during server-side rendering, and
 * in browsers that block storage (private windows in some browsers, or a
 * sandboxed iframe). Callers treat null as "offline downloads aren't supported
 * here" and hide the feature rather than failing.
 */
export declare function createIndexedDbTranslationStore(): OfflineTranslationStore | null;
/**
 * An in-memory store with the same semantics as the IndexedDB one.
 *
 * Used by tests (jsdom has no IndexedDB) and usable as a fallback in any
 * environment where persistence isn't available but the code paths still need to
 * work.
 */
export declare function createInMemoryTranslationStore(): OfflineTranslationStore;
