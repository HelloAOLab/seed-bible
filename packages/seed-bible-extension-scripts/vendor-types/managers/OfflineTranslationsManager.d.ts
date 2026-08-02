/**
 * Downloading whole translations to the device for offline reading.
 *
 * Normally the reader fetches one chapter at a time, which makes the first load
 * fast but means nothing can be read without a connection. This manager lets a
 * user download an entire translation up front (the API's
 * `api/{translation}/complete.json` endpoint), stores it in IndexedDB, and then
 * serves chapters back in exactly the same shape the network would have — so the
 * rest of the app is unaware of where a chapter came from.
 *
 * It owns three jobs:
 *
 * 1. **Download / delete** a translation, with progress and cancellation.
 * 2. **Detect stale downloads** by comparing the stored content hash against the
 *    `sha256` the API currently reports for that translation.
 * 3. **Read** books and chapters back out of storage, rebuilding the
 *    `TranslationBooks` / `TranslationBookChapter` shapes the reader expects.
 *
 * {@link BibleDataManager} owns an instance and checks it before going to the
 * network — see `getTranslationBookChapter` there.
 */
import { type ReadonlySignal } from "@preact/signals";
import type { MergeTranslationsOptions } from "./BibleDataManager";
import type {
  FreeUseBibleAPI,
  Translation,
  TranslationBookChapter,
  TranslationBooks,
} from "./FreeUseBibleAPI";
import {
  type DownloadedTranslation,
  type OfflineTranslationStore,
} from "./OfflineTranslationStore";
/** Which half of a download is currently running. */
export type OfflineDownloadPhase = "downloading" | "saving";
/** Live progress for one in-flight download. */
export interface OfflineDownloadProgress {
  /** The translation being downloaded. */
  translationId: string;
  /**
   * `"downloading"` while bytes are arriving from the API, `"saving"` while
   * chapters are being written to the device.
   */
  phase: OfflineDownloadPhase;
  /**
   * Fraction complete for the current phase, from 0 to 1. Null while
   * downloading if the server didn't report a size.
   */
  ratio: number | null;
  /** Bytes received so far. */
  receivedBytes: number;
  /** Total bytes expected, or null when the server didn't report a size. */
  totalBytes: number | null;
  /** Chapters written to the device so far. */
  savedChapters: number;
  /** Total chapters to write. Zero until the download finishes. */
  totalChapters: number;
}
/** A downloaded translation as the UI sees it. */
export interface OfflineTranslationSummary {
  /** The ID of the downloaded translation. */
  translationId: string;
  /** The API endpoint it was downloaded from. */
  endpoint: string;
  /** When the download completed, as epoch milliseconds. */
  downloadedAt: number;
  /** Approximate size on the device, in bytes. */
  sizeBytes: number;
  /** How many chapters are stored. */
  numberOfChapters: number;
  /**
   * True when the API now reports a different content hash than the copy on this
   * device, i.e. the download is out of date. Always false when either side
   * didn't report a hash — we never claim an update exists without evidence.
   */
  updateAvailable: boolean;
}
export interface OfflineTranslationsManager {
  /**
   * Whether this device can store translations at all. False during SSR and
   * wherever IndexedDB is blocked; the UI hides the feature when false.
   */
  supported: boolean;
  /**
   * Resolves once the initial read of already-downloaded translations has
   * finished. The read paths await this so a chapter request that arrives during
   * startup still finds a local copy instead of falling through to the network.
   */
  ready: Promise<void>;
  /** The raw stored records, keyed by translation ID. */
  records: ReadonlySignal<Map<string, DownloadedTranslation>>;
  /** Downloaded translations keyed by ID, including their update status. */
  downloaded: ReadonlySignal<Map<string, OfflineTranslationSummary>>;
  /** In-flight downloads keyed by translation ID. */
  downloads: ReadonlySignal<Map<string, OfflineDownloadProgress>>;
  /**
   * The most recent failure per translation ID. Cleared when a download is
   * retried and when the translation is deleted.
   */
  errors: ReadonlySignal<Map<string, string>>;
  /** Whether the browser currently reports a network connection. */
  isOnline: ReadonlySignal<boolean>;
  /** Whether the given translation has a complete copy on this device. */
  isDownloaded: (translationId: string) => boolean;
  /**
   * Downloads a translation to the device, replacing any existing copy.
   *
   * Resolves to true when the translation was stored, and false when the
   * download was cancelled or failed — failures are reported through
   * {@link OfflineTranslationsManager.errors} rather than thrown, so a
   * fire-and-forget click handler can't produce an unhandled rejection.
   */
  downloadTranslation: (translationId: string) => Promise<boolean>;
  /** Aborts an in-flight download. Does nothing if none is running. */
  cancelDownload: (translationId: string) => void;
  /** Removes a downloaded translation from the device. */
  deleteTranslation: (translationId: string) => Promise<void>;
  /**
   * Refreshes the API's translation list so stale downloads can be spotted.
   *
   * Does nothing when the device is offline or nothing is downloaded. The
   * `updateAvailable` flags are derived from the refreshed list, so they update
   * on their own once this resolves.
   */
  checkForUpdates: () => Promise<void>;
  /** The books of a downloaded translation, or null if it isn't downloaded. */
  getTranslationBooks: (
    translationId: string
  ) => Promise<TranslationBooks | null>;
  /** A chapter from a downloaded translation, or null if it isn't stored. */
  getTranslationBookChapter: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => Promise<TranslationBookChapter | null>;
  /**
   * The chapter before or after the given one, resolved entirely from local
   * data so it works with no connection. Null when the translation isn't
   * downloaded, or when there is no such chapter (start/end of the Bible).
   */
  getAdjacentChapter: (
    chapter: TranslationBookChapter,
    direction: "next" | "previous"
  ) => Promise<TranslationBookChapter | null>;
  /**
   * Releases the manager's hold on the page: removes its `online`/`offline`
   * listeners and aborts any in-flight download.
   *
   * The app's instance lives as long as the page does, so this is mainly for
   * tests and for anything that builds a manager per unit of work.
   */
  dispose: () => void;
}
export interface CreateOfflineTranslationsManagerOptions {
  /** The API used to download complete translations. */
  api: FreeUseBibleAPI;
  /**
   * Where downloads are stored. Defaults to IndexedDB; pass an explicit store to
   * inject a fake in tests, or null to disable the feature.
   */
  store?: OfflineTranslationStore | null;
  /** The known translations, used to look up download links and hashes. */
  availableTranslations: ReadonlySignal<Translation[]>;
  /** Resolves which API endpoint a translation belongs to. */
  getEndpointForTranslation: (translationId: string) => string;
  /** Re-fetches an endpoint's translation list, used by `checkForUpdates`. */
  refreshTranslations: (endpoint: string) => Promise<Translation[]>;
  /**
   * Folds translation metadata back into the app's known-translations list.
   *
   * Called after downloads load so a downloaded translation still shows up in
   * the selector when the device is offline and the API list can't be fetched.
   *
   * `fillOnly` is passed whenever the metadata is a saved copy from download
   * time, so it can't overwrite something the app has since learned from the
   * API — see {@link MergeTranslationsOptions}.
   */
  mergeTranslations: (
    endpoint: string,
    translations: Translation[],
    options?: MergeTranslationsOptions
  ) => void;
}
export declare function createOfflineTranslationsManager(
  options: CreateOfflineTranslationsManagerOptions
): OfflineTranslationsManager;
