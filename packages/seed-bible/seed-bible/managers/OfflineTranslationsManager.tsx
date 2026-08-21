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

import { computed, signal, type ReadonlySignal } from "@preact/signals";
// Type-only, so this doesn't create a runtime cycle with BibleDataManager (which
// imports this module to construct the manager).
import type { MergeTranslationsOptions } from "./BibleDataManager";
import type {
  CompleteTranslation,
  FreeUseBibleAPI,
  Translation,
  TranslationBook,
  TranslationBookChapter,
  TranslationBooks,
} from "./FreeUseBibleAPI";
import {
  createIndexedDbTranslationStore,
  type DownloadedTranslation,
  type OfflineTranslationStore,
  type StoredChapterEntry,
} from "./OfflineTranslationStore";

/** Translation ID -> when the offline download prompt was shown, in epoch ms. */
const PROMPT_SHOWN_KEY = "sb-offline-prompt-shown";

/** Translation ID -> when the user first read in it, in epoch ms. */
const TRANSLATION_FIRST_USED_KEY = "sb-translation-first-used";

/**
 * How long a translation must have been in use before we offer to save it.
 *
 * The very first offer on a device skips this — a reader with nothing saved is
 * worth telling about the feature as soon as they settle in. Every offer after
 * that has to earn its place with a day of the user actually staying with the
 * translation, so that flicking through translations can't produce a run of
 * prompts.
 */
const PROMPT_TENURE_MS = 24 * 60 * 60 * 1000;

/**
 * Rough bytes per verse in a complete translation download.
 *
 * Nothing reports a translation's download size ahead of time: `sizeBytes` is
 * only known once a download finishes, and the complete-translation endpoint
 * doesn't expose `Content-Length` to cross-origin JS (see the note in
 * `OfflineTranslationControls`). Verse count is the one size-proportional
 * number the API does give us, so the prompt estimates from that and says
 * "about". Calibrated against a full Bible: 31,102 verses ≈ 7.1 MB on disk.
 */
const BYTES_PER_VERSE_ESTIMATE = 240;

const MAX_TRACKED_TIMESTAMPS = 5;

/** Reads a translation-ID -> timestamp map from local storage. */
function readTimestamps(key: string): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number"
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

/**
 * Writes a translation-ID -> timestamp map to local storage, keeping only the
 * {@link MAX_TRACKED_TIMESTAMPS} newest entries. Best-effort.
 */
function writeTimestamps(key: string, value: Record<string, number>): void {
  try {
    const trimmed = Object.entries(value)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TRACKED_TIMESTAMPS);
    window.localStorage.setItem(
      key,
      JSON.stringify(Object.fromEntries(trimmed))
    );
  } catch {
    // Storage can be full or blocked; losing the record only means the user
    // may be offered the download again on a later visit.
  }
}

/** Renders a byte count as a short, human-readable size like "7.1 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`;
  }
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

/**
 * Approximate download size for a translation, in bytes, or null when the API
 * didn't report a verse count to estimate from. See
 * {@link BYTES_PER_VERSE_ESTIMATE} for why this is an estimate at all.
 */
export function estimateTranslationSizeBytes(
  translation: Translation
): number | null {
  const verses = translation.totalNumberOfVerses;
  if (typeof verses !== "number" || verses <= 0) {
    return null;
  }
  return verses * BYTES_PER_VERSE_ESTIMATE;
}

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
   * The translation currently being offered for offline download, or null when
   * no offer is on screen.
   */
  downloadPrompt: ReadonlySignal<Translation | null>;

  /**
   * Records that the user is reading in a translation, stamping the first time
   * it was seen. Idempotent — later calls keep the original timestamp, since
   * {@link offerDownloadPrompt} asks how long a translation has been in use,
   * not when it was last used.
   */
  noteTranslationInUse: (translationId: string) => void;

  /**
   * Offers to save a translation for offline reading, if every condition is
   * met: the device can store downloads, no prompt has been shown yet this
   * session, the device is online, this translation isn't already downloaded or
   * downloading, it has never been offered before, and — unless this is the
   * first offer the device has ever made — the user has been reading this
   * translation for at least a day.
   *
   * Returns whether the offer was actually opened. Showing it also records the
   * offer, so declining doesn't bring it back on the next visit.
   */
  offerDownloadPrompt: (translation: Translation) => boolean;

  /** Closes the download offer without downloading anything. */
  dismissDownloadPrompt: () => void;

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

/** A book plus chapter coordinate, used for next/previous resolution. */
interface ChapterRef {
  book: string;
  chapter: number;
}

/**
 * Turns a complete download into the {@link TranslationBook} records the reader
 * expects.
 *
 * The complete file omits the per-chapter API links that `books.json` includes,
 * so they are rebuilt here from the endpoint. Keeping them accurate matters
 * because a chapter read may still fall back to the network — for instance if
 * the user deletes the download while a tab is open.
 */
function toTranslationBooks(
  complete: CompleteTranslation,
  endpoint: string
): TranslationBook[] {
  const translationId = complete.translation.id;

  return [...complete.books]
    .sort((a, b) => a.order - b.order)
    .map((book) => {
      const chapterNumbers = book.chapters.map((entry) => entry.chapter.number);
      const firstChapterNumber = chapterNumbers.length
        ? Math.min(...chapterNumbers)
        : 1;
      const lastChapterNumber = chapterNumbers.length
        ? Math.max(...chapterNumbers)
        : firstChapterNumber;

      const translationBook: TranslationBook = {
        id: book.id,
        name: book.name,
        commonName: book.commonName,
        title: book.title ?? null,
        order: book.order,
        numberOfChapters: book.numberOfChapters,
        firstChapterNumber,
        firstChapterApiLink: chapterApiLink(
          endpoint,
          translationId,
          book.id,
          firstChapterNumber
        ),
        lastChapterNumber,
        lastChapterApiLink: chapterApiLink(
          endpoint,
          translationId,
          book.id,
          lastChapterNumber
        ),
        totalNumberOfVerses: book.totalNumberOfVerses,
      };

      if (book.isApocryphal) {
        translationBook.isApocryphal = true;
      }

      return translationBook;
    });
}

/** Flattens a complete download into one storable entry per chapter. */
function toChapterEntries(complete: CompleteTranslation): StoredChapterEntry[] {
  const entries: StoredChapterEntry[] = [];

  for (const book of complete.books) {
    for (const entry of book.chapters) {
      entries.push({
        book: book.id,
        chapter: entry.chapter.number,
        data: {
          numberOfVerses: entry.numberOfVerses,
          thisChapterAudioLinks: entry.thisChapterAudioLinks ?? {},
          chapter: entry.chapter,
        },
      });
    }
  }

  return entries;
}

/** Builds an absolute URL to a chapter on the given endpoint. */
function chapterApiLink(
  endpoint: string,
  translationId: string,
  bookId: string,
  chapterNumber: number
): string {
  const path = `api/${encodeURIComponent(translationId)}/${encodeURIComponent(
    bookId
  )}/${chapterNumber}.json`;
  try {
    return new URL(path, endpoint).href;
  } catch {
    return `/${path}`;
  }
}

/**
 * Finds the chapter immediately before or after the given one, crossing book
 * boundaries the way the API's own next/previous links do.
 */
function adjacentChapterRef(
  books: TranslationBook[],
  bookId: string,
  chapterNumber: number,
  direction: "next" | "previous"
): ChapterRef | null {
  const ordered = [...books].sort((a, b) => a.order - b.order);
  const bookIndex = ordered.findIndex((book) => book.id === bookId);
  const book = ordered[bookIndex];
  if (!book) {
    return null;
  }

  const firstChapter = book.firstChapterNumber ?? 1;
  const lastChapter =
    book.lastChapterNumber ?? firstChapter + book.numberOfChapters - 1;

  if (direction === "next") {
    if (chapterNumber < lastChapter) {
      return { book: book.id, chapter: chapterNumber + 1 };
    }
    const nextBook = ordered[bookIndex + 1];
    return nextBook
      ? { book: nextBook.id, chapter: nextBook.firstChapterNumber ?? 1 }
      : null;
  }

  if (chapterNumber > firstChapter) {
    return { book: book.id, chapter: chapterNumber - 1 };
  }
  const previousBook = ordered[bookIndex - 1];
  if (!previousBook) {
    return null;
  }
  const previousFirst = previousBook.firstChapterNumber ?? 1;
  return {
    book: previousBook.id,
    chapter:
      previousBook.lastChapterNumber ??
      previousFirst + previousBook.numberOfChapters - 1,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Failed to download the translation.";
}

export function createOfflineTranslationsManager(
  options: CreateOfflineTranslationsManagerOptions
): OfflineTranslationsManager {
  const {
    api,
    availableTranslations,
    getEndpointForTranslation,
    refreshTranslations,
    mergeTranslations,
  } = options;

  const store =
    options.store === undefined
      ? createIndexedDbTranslationStore()
      : options.store;

  const records = signal<Map<string, DownloadedTranslation>>(new Map());
  const downloads = signal<Map<string, OfflineDownloadProgress>>(new Map());
  const errors = signal<Map<string, string>>(new Map());
  const isOnline = signal<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );

  const controllers = new Map<string, AbortController>();

  // `updateAvailable` is derived rather than stored so a refreshed translation
  // list flips the flags on its own — nothing has to write back into `records`,
  // which would risk a write/read loop between the two signals.
  const downloaded = computed<Map<string, OfflineTranslationSummary>>(() => {
    const currentTranslations = new Map(
      availableTranslations.value.map((translation) => [
        translation.id,
        translation,
      ])
    );

    const summaries = new Map<string, OfflineTranslationSummary>();
    for (const record of records.value.values()) {
      const latestHash = currentTranslations.get(record.translationId)?.sha256;
      summaries.set(record.translationId, {
        translationId: record.translationId,
        endpoint: record.endpoint,
        downloadedAt: record.downloadedAt,
        sizeBytes: record.sizeBytes,
        numberOfChapters: record.numberOfChapters,
        updateAvailable: Boolean(
          record.sha256 && latestHash && record.sha256 !== latestHash
        ),
      });
    }
    return summaries;
  });

  const setProgress = (
    translationId: string,
    progress: OfflineDownloadProgress
  ) => {
    const next = new Map(downloads.value);
    next.set(translationId, progress);
    downloads.value = next;
  };

  const clearProgress = (translationId: string) => {
    if (!downloads.value.has(translationId)) {
      return;
    }
    const next = new Map(downloads.value);
    next.delete(translationId);
    downloads.value = next;
  };

  const setError = (translationId: string, message: string) => {
    const next = new Map(errors.value);
    next.set(translationId, message);
    errors.value = next;
  };

  const clearError = (translationId: string) => {
    if (!errors.value.has(translationId)) {
      return;
    }
    const next = new Map(errors.value);
    next.delete(translationId);
    errors.value = next;
  };

  const setRecord = (record: DownloadedTranslation) => {
    const next = new Map(records.value);
    next.set(record.translationId, record);
    records.value = next;
  };

  const removeRecord = (translationId: string) => {
    if (!records.value.has(translationId)) {
      return;
    }
    const next = new Map(records.value);
    next.delete(translationId);
    records.value = next;
  };

  /**
   * Re-reads one translation's metadata from storage so the signal matches what
   * is actually on the device.
   *
   * Needed after a failed or cancelled download: saving replaces any existing
   * copy, so it deletes the old one before writing the new one. If it doesn't get
   * that far, the device has nothing even though the signal still remembers the
   * previous download.
   */
  const syncRecordFromStore = async (translationId: string): Promise<void> => {
    if (!store) {
      return;
    }
    try {
      const stored = await store.get(translationId);
      if (stored) {
        setRecord(stored);
      } else {
        removeRecord(translationId);
      }
    } catch (error) {
      console.warn(
        `Failed to re-read the stored copy of ${translationId}.`,
        error
      );
    }
  };

  /**
   * Makes downloaded translations visible in the app's translation list even
   * when the API can't be reached, so an offline user can still find and open
   * what they downloaded.
   *
   * `options.fillOnly` decides whether these records are allowed to replace what
   * the list already holds. Records read back from storage must not (their
   * metadata is from download time, and replacing a newly fetched `sha256` with
   * it would hide an available update), but a record from a download that just
   * finished may — its metadata came from the payload we downloaded seconds ago,
   * which is the freshest thing anyone has.
   */
  const publishRecordTranslations = (
    storedRecords: Iterable<DownloadedTranslation>,
    options?: MergeTranslationsOptions
  ) => {
    const byEndpoint = new Map<string, Translation[]>();
    for (const record of storedRecords) {
      const existing = byEndpoint.get(record.endpoint);
      if (existing) {
        existing.push(record.translation);
      } else {
        byEndpoint.set(record.endpoint, [record.translation]);
      }
    }
    for (const [endpoint, translations] of byEndpoint) {
      mergeTranslations(endpoint, translations, options);
    }
  };

  const ready: Promise<void> = (async () => {
    if (!store) {
      return;
    }
    try {
      const storedRecords = await store.list();
      records.value = new Map(
        storedRecords.map((record) => [record.translationId, record])
      );
      publishRecordTranslations(storedRecords, { fillOnly: true });
    } catch (error) {
      console.warn("Failed to read downloaded translations.", error);
    }
  })();

  const handleOnline = () => {
    isOnline.value = true;
    void checkForUpdates();
  };
  const handleOffline = () => {
    isOnline.value = false;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  const dispose = () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
    for (const controller of controllers.values()) {
      controller.abort();
    }
    controllers.clear();
  };

  const getRecord = async (
    translationId: string
  ): Promise<DownloadedTranslation | null> => {
    await ready;
    return records.value.get(translationId) ?? null;
  };

  const isDownloaded = (translationId: string): boolean =>
    records.value.has(translationId);

  const downloadTranslation = async (
    translationId: string
  ): Promise<boolean> => {
    if (!store) {
      setError(
        translationId,
        "Offline downloads aren't supported on this device."
      );
      return false;
    }
    if (downloads.value.has(translationId)) {
      return false;
    }

    await ready;
    clearError(translationId);

    const endpoint = getEndpointForTranslation(translationId);
    const translation =
      availableTranslations.value.find(
        (candidate) => candidate.id === translationId
      ) ?? null;

    const controller = new AbortController();
    controllers.set(translationId, controller);
    setProgress(translationId, {
      translationId,
      phase: "downloading",
      ratio: null,
      receivedBytes: 0,
      totalBytes: null,
      savedChapters: 0,
      totalChapters: 0,
    });

    try {
      const complete = await api.getCompleteTranslation(
        translation ?? translationId,
        {
          endpoint,
          signal: controller.signal,
          onProgress: (receivedBytes, totalBytes) => {
            setProgress(translationId, {
              translationId,
              phase: "downloading",
              // Clamped because `Content-Length` describes the compressed
              // response while the reader reports decompressed bytes, which can
              // otherwise push this past 1.
              ratio: totalBytes
                ? Math.min(1, receivedBytes / totalBytes)
                : null,
              receivedBytes,
              totalBytes,
              savedChapters: 0,
              totalChapters: 0,
            });
          },
        }
      );

      const chapters = toChapterEntries(complete);
      const books = toTranslationBooks(complete, endpoint);
      const receivedBytes = downloads.value.get(translationId)?.receivedBytes;

      setProgress(translationId, {
        translationId,
        phase: "saving",
        ratio: 0,
        receivedBytes: receivedBytes ?? 0,
        totalBytes: downloads.value.get(translationId)?.totalBytes ?? null,
        savedChapters: 0,
        totalChapters: chapters.length,
      });

      const record: DownloadedTranslation = {
        translationId,
        endpoint,
        sha256: complete.translation.sha256 ?? translation?.sha256 ?? null,
        downloadedAt: Date.now(),
        sizeBytes: receivedBytes ?? 0,
        numberOfChapters: chapters.length,
        translation: complete.translation,
        books,
      };

      await store.save(record, chapters, {
        // Handing the signal to the store is what makes cancelling during the
        // save phase real: it stops writing chapters and removes the ones it
        // already wrote, instead of finishing the save while the UI still shows
        // a cancel button.
        signal: controller.signal,
        onProgress: (savedChapters, totalChapters) => {
          setProgress(translationId, {
            translationId,
            phase: "saving",
            ratio: totalChapters ? savedChapters / totalChapters : 1,
            receivedBytes: receivedBytes ?? 0,
            totalBytes: downloads.value.get(translationId)?.totalBytes ?? null,
            savedChapters,
            totalChapters,
          });
        },
      });

      setRecord(record);
      // Not `fillOnly`: this metadata came from the payload we just downloaded,
      // so it is the freshest the app has and should replace whatever is there.
      publishRecordTranslations([record]);
      return true;
    } catch (error) {
      // Whatever went wrong, the device may now hold less than `records` claims,
      // because saving deletes the previous copy before writing the new one.
      await syncRecordFromStore(translationId);

      if (isAbortError(error)) {
        // Cancelling isn't a failure, so it leaves no error behind. Nothing
        // half-written is left on the device either: cancelling during the
        // download never starts writing, and cancelling during the save rolls its
        // own writes back.
        return false;
      }
      setError(translationId, toErrorMessage(error));
      return false;
    } finally {
      controllers.delete(translationId);
      clearProgress(translationId);
    }
  };

  const cancelDownload = (translationId: string) => {
    controllers.get(translationId)?.abort();
  };

  const deleteTranslation = async (translationId: string): Promise<void> => {
    cancelDownload(translationId);
    if (!store) {
      return;
    }
    await store.delete(translationId);
    removeRecord(translationId);
    clearError(translationId);
  };

  const checkForUpdates = async (): Promise<void> => {
    if (!isOnline.value) {
      return;
    }
    await ready;
    const storedRecords = [...records.value.values()];
    if (storedRecords.length === 0) {
      return;
    }

    const endpoints = new Set(storedRecords.map((record) => record.endpoint));
    for (const endpoint of endpoints) {
      try {
        await refreshTranslations(endpoint);
      } catch (error) {
        // An unreachable endpoint just means we can't tell whether an update
        // exists — the existing download stays usable either way.
        console.warn(
          `Failed to check ${endpoint} for translation updates.`,
          error
        );
      }
    }
  };

  const getTranslationBooks = async (
    translationId: string
  ): Promise<TranslationBooks | null> => {
    const record = await getRecord(translationId);
    if (!record) {
      return null;
    }
    return { translation: record.translation, books: record.books };
  };

  const buildChapter = async (
    record: DownloadedTranslation,
    bookId: string,
    chapterNumber: number
  ): Promise<TranslationBookChapter | null> => {
    if (!store) {
      return null;
    }

    const book = record.books.find((candidate) => candidate.id === bookId);
    if (!book) {
      return null;
    }

    const stored = await store.getChapter(
      record.translationId,
      bookId,
      chapterNumber
    );
    if (!stored) {
      return null;
    }

    const nextRef = adjacentChapterRef(
      record.books,
      bookId,
      chapterNumber,
      "next"
    );
    const previousRef = adjacentChapterRef(
      record.books,
      bookId,
      chapterNumber,
      "previous"
    );

    // The neighbours are read only for their audio links, which the API includes
    // alongside the next/previous links.
    const nextStored = nextRef
      ? await store.getChapter(
          record.translationId,
          nextRef.book,
          nextRef.chapter
        )
      : null;
    const previousStored = previousRef
      ? await store.getChapter(
          record.translationId,
          previousRef.book,
          previousRef.chapter
        )
      : null;

    return {
      translation: record.translation,
      book,
      thisChapterLink: chapterApiLink(
        record.endpoint,
        record.translationId,
        bookId,
        chapterNumber
      ),
      thisChapterAudioLinks: stored.thisChapterAudioLinks ?? {},
      nextChapterApiLink: nextRef
        ? chapterApiLink(
            record.endpoint,
            record.translationId,
            nextRef.book,
            nextRef.chapter
          )
        : null,
      nextChapterAudioLinks: nextStored?.thisChapterAudioLinks ?? null,
      previousChapterApiLink: previousRef
        ? chapterApiLink(
            record.endpoint,
            record.translationId,
            previousRef.book,
            previousRef.chapter
          )
        : null,
      previousChapterAudioLinks: previousStored?.thisChapterAudioLinks ?? null,
      numberOfVerses: stored.numberOfVerses,
      chapter: stored.chapter,
    };
  };

  const getTranslationBookChapter = async (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Promise<TranslationBookChapter | null> => {
    const record = await getRecord(translationId);
    if (!record) {
      return null;
    }
    return await buildChapter(record, bookId, chapterNumber);
  };

  const getAdjacentChapter = async (
    chapter: TranslationBookChapter,
    direction: "next" | "previous"
  ): Promise<TranslationBookChapter | null> => {
    const record = await getRecord(chapter.translation.id);
    if (!record) {
      return null;
    }

    const ref = adjacentChapterRef(
      record.books,
      chapter.book.id,
      chapter.chapter.number,
      direction
    );
    if (!ref) {
      return null;
    }

    return await buildChapter(record, ref.book, ref.chapter);
  };

  const downloadPrompt = signal<Translation | null>(null);

  // "When we show one prompt, we should never show any more download prompts
  // for that session." Deliberately a closure rather than storage: it resets on
  // the next load, while the per-translation record in PROMPT_SHOWN_KEY is what
  // stops the same translation being offered again.
  let promptedThisSession = false;

  const noteTranslationInUse = (translationId: string) => {
    if (!translationId) {
      return;
    }
    const stamps = readTimestamps(TRANSLATION_FIRST_USED_KEY);
    if (stamps[translationId]) {
      return;
    }
    writeTimestamps(TRANSLATION_FIRST_USED_KEY, {
      ...stamps,
      [translationId]: Date.now(),
    });
  };

  const offerDownloadPrompt = (translation: Translation): boolean => {
    if (store === null) {
      return false;
    }
    if (promptedThisSession || downloadPrompt.value) {
      return false;
    }
    // Offering a download with no connection would only fail.
    if (!isOnline.value) {
      return false;
    }

    const translationId = translation?.id;
    if (!translationId) {
      return false;
    }
    if (isDownloaded(translationId) || downloads.value.has(translationId)) {
      return false;
    }

    const shown = readTimestamps(PROMPT_SHOWN_KEY);
    if (shown[translationId]) {
      return false;
    }

    // Only the very first offer is made on sight, and only on a device with
    // nothing saved. Every later one waits for the user to have stayed with the
    // translation for a day — otherwise switching translations would be enough
    // to earn another prompt.
    const isFirstEverOffer =
      Object.keys(shown).length === 0 && downloaded.value.size === 0;
    if (!isFirstEverOffer) {
      const firstUsed = readTimestamps(TRANSLATION_FIRST_USED_KEY)[
        translationId
      ];
      if (!firstUsed || Date.now() - firstUsed < PROMPT_TENURE_MS) {
        return false;
      }
    }

    promptedThisSession = true;
    writeTimestamps(PROMPT_SHOWN_KEY, {
      ...shown,
      [translationId]: Date.now(),
    });
    downloadPrompt.value = translation;
    return true;
  };

  const dismissDownloadPrompt = () => {
    downloadPrompt.value = null;
  };

  return {
    supported: store !== null,
    ready,
    records,
    downloaded,
    downloads,
    errors,
    isOnline,
    isDownloaded,
    downloadPrompt,
    noteTranslationInUse,
    offerDownloadPrompt,
    dismissDownloadPrompt,
    downloadTranslation,
    cancelDownload,
    deleteTranslation,
    checkForUpdates,
    getTranslationBooks,
    getTranslationBookChapter,
    getAdjacentChapter,
    dispose,
  };
}
