/**
 * Keeps dataset files (an interlinear chapter, a lexicon entry, a dataset's
 * book list) on the device, so a later visit doesn't need the network and a
 * reader who goes offline still sees what they looked at before.
 *
 * The API's own response cache (`FreeUseBibleAPI`) lives in memory and is gone
 * after a reload; this is the layer under it that survives one. Datasets are
 * read-only reference data that changes only by the odd correction, which is
 * what makes a long freshness window safe.
 *
 * Its own database rather than a store in `seed-bible-offline`: bumping a
 * shared database's version for one feature fires `onblocked` in any tab still
 * holding the old connection, breaking a feature that didn't change (see
 * `OfflineRecordStore`).
 */
import { ApiRequestError } from "./FreeUseBibleAPI";
import { requestToPromise, transactionToPromise } from "./indexedDbUtils";

export const DATASET_DB_NAME = "seed-bible-datasets";

const FILES_STORE = "files";

/**
 * Records by when they were fetched, so clearing out old files reads only the
 * keys of the expired ones rather than every (large) saved file.
 */
const FETCHED_AT_INDEX = "fetchedAtMs";

/**
 * How long a downloaded file is served before it is fetched again. The API
 * only promises freshness for a day (`Cache-Control: max-age=86400`), but
 * datasets change only by the odd correction, so thirty days keeps the cache
 * useful while still letting fixes through.
 */
export const DATASET_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How long opening the database may take before the device store is given up
 * on for the session. Every read waits for the open before trying the
 * network, and some browsers (some iOS Safari versions, some private modes)
 * have left it hanging without ever answering or failing.
 */
export const DATASET_DB_OPEN_TIMEOUT_MS = 3000;

/** How long a 404 is remembered: the API's own one day. */
export const DATASET_NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long an expired file stays on the device as the offline answer. A year:
 * a reader who studied a passage once should still be able to study it on a
 * plane months later.
 */
export const DATASET_KEEP_STALE_MS = 365 * 24 * 60 * 60 * 1000;

/** What the device holds for one file: the file, or the API's 404 for it. */
export type DatasetFileRecord =
  | { outcome: "found"; value: unknown; fetchedAtMs: number }
  | {
      outcome: "not-found";
      /** The URL the API answered 404 for, to rebuild the same error. */
      url: string;
      fetchedAtMs: number;
    };

export interface OfflineDatasetStore {
  /** The record for a key, however old, or null when there is none. */
  get(key: string): Promise<DatasetFileRecord | null>;

  put(key: string, record: DatasetFileRecord): Promise<void>;

  /** Deletes every record fetched before `cutoffMs`. */
  prune(cutoffMs: number): Promise<void>;
}

type StoredDatasetFileRecord = DatasetFileRecord & { key: string };

/**
 * Creates the IndexedDB-backed store.
 *
 * Returns null when IndexedDB is unavailable: during server-side rendering,
 * and in browsers that block storage (private windows in some browsers, or a
 * sandboxed iframe). Callers treat null as "nothing kept on this device" and
 * fetch every time, rather than failing.
 */
export function createIndexedDbDatasetStore(): OfflineDatasetStore | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let databasePromise: Promise<IDBDatabase> | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (databasePromise) {
      return databasePromise;
    }

    let timedOut = false;
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const timer = setTimeout(() => {
        timedOut = true;
        reject(new Error(`Opening ${DATASET_DB_NAME} timed out.`));
      }, DATASET_DB_OPEN_TIMEOUT_MS);

      const request = indexedDB.open(DATASET_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(FILES_STORE)) {
          database
            .createObjectStore(FILES_STORE, { keyPath: "key" })
            .createIndex(FETCHED_AT_INDEX, "fetchedAtMs");
        }
      };

      request.onsuccess = () => {
        clearTimeout(timer);
        const database = request.result;
        if (timedOut) {
          database.close();
          return;
        }
        // A version change from another tab invalidates this handle; drop the
        // cached promise so the next call reopens instead of using a dead one.
        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };
        resolve(database);
      };

      request.onerror = () => {
        clearTimeout(timer);
        reject(
          request.error ?? new Error(`Failed to open ${DATASET_DB_NAME}.`)
        );
      };
    }).catch((error) => {
      // A failed open is retried on the next call. A timed-out one isn't: a
      // browser that left one open hanging tends to hang the next too, so
      // only the session's first read waits for it.
      if (!timedOut) {
        databasePromise = null;
      }
      throw error;
    });

    return databasePromise;
  };

  return {
    async get(key) {
      const database = await openDatabase();
      const transaction = database.transaction(FILES_STORE, "readonly");
      const record = await requestToPromise<
        StoredDatasetFileRecord | undefined
      >(transaction.objectStore(FILES_STORE).get(key));
      return record ?? null;
    },

    async put(key, record) {
      const database = await openDatabase();
      const transaction = database.transaction(FILES_STORE, "readwrite");
      transaction
        .objectStore(FILES_STORE)
        .put({ ...record, key } satisfies StoredDatasetFileRecord);
      await transactionToPromise(transaction);
    },

    async prune(cutoffMs) {
      const database = await openDatabase();
      const transaction = database.transaction(FILES_STORE, "readwrite");
      const files = transaction.objectStore(FILES_STORE);
      const expiredKeys = await requestToPromise(
        files
          .index(FETCHED_AT_INDEX)
          .getAllKeys(IDBKeyRange.upperBound(cutoffMs, true))
      );
      for (const key of expiredKeys) {
        files.delete(key);
      }
      await transactionToPromise(transaction);
    },
  };
}

/** A store that keeps records in memory only, standing in for IndexedDB in tests. */
export function createInMemoryDatasetStore(): OfflineDatasetStore & {
  records: Map<string, DatasetFileRecord>;
} {
  const records = new Map<string, DatasetFileRecord>();

  return {
    records,
    async get(key) {
      return records.get(key) ?? null;
    },
    async put(key, record) {
      records.set(key, record);
    },
    async prune(cutoffMs) {
      for (const [key, record] of records) {
        if (record.fetchedAtMs < cutoffMs) {
          records.delete(key);
        }
      }
    },
  };
}

export interface DatasetCacheReadOptions {
  /** Skip a fresh copy on the device and ask the network first. */
  refresh?: boolean;
  /** When aborted, a failed request rejects instead of falling back. */
  signal?: AbortSignal;
}

export interface DatasetCache {
  /**
   * The file at `key`, downloaded with `load` when the device has no fresh
   * copy. Rejects with the API's 404 `ApiRequestError` when there is no such
   * file, remembered or live, so callers can't tell the two apart; and with
   * the network's error when it can't be reached and nothing is kept.
   */
  read<T>(
    key: string,
    load: () => Promise<T>,
    options?: DatasetCacheReadOptions
  ): Promise<T>;
}

/**
 * Reads dataset files through `store`, falling back to the network.
 *
 * When the network fails, an expired copy still on the device is served
 * rather than the error: old reference data beats none. A store read or write
 * that throws is ignored rather than surfaced: storage can be blocked or full,
 * and reference data is never worth failing a read over.
 */
export function createDatasetCache(
  store: OfflineDatasetStore | null
): DatasetCache {
  if (!store) {
    return { read: (_key, load) => load() };
  }
  const files: OfflineDatasetStore = store;

  let hasPruned = false;
  /** Reads under way, so files several callers ask for at once are saved once. */
  const pending = new Map<string, Promise<unknown>>();

  /**
   * Expired files are otherwise only replaced when revisited, so the ones that
   * never are would stay on the device for good. Started after the session's
   * first read rather than before it: the browser runs storage requests in
   * order, so the reader's first file would otherwise wait behind it.
   */
  const pruneOnce = () => {
    if (hasPruned) {
      return;
    }
    hasPruned = true;
    void files
      .prune(Date.now() - DATASET_CACHE_TTL_MS - DATASET_KEEP_STALE_MS)
      .catch(() => undefined);
  };

  const isFresh = (record: DatasetFileRecord, nowMs: number) =>
    nowMs - record.fetchedAtMs <=
    (record.outcome === "not-found"
      ? DATASET_NOT_FOUND_TTL_MS
      : DATASET_CACHE_TTL_MS);

  const recall = async (key: string): Promise<DatasetFileRecord | null> => {
    try {
      return await files.get(key);
    } catch {
      return null;
    }
  };

  const remember = async (key: string, record: DatasetFileRecord) => {
    try {
      await files.put(key, record);
    } catch {
      // A store that won't accept writes still serves reads fine.
    }
  };

  const answerFrom = <T>(record: DatasetFileRecord): T => {
    if (record.outcome === "not-found") {
      throw new ApiRequestError(record.url, 404, "Not Found");
    }
    return record.value as T;
  };

  const readThrough = async <T>(
    key: string,
    load: () => Promise<T>,
    options?: DatasetCacheReadOptions
  ): Promise<T> => {
    const cached = await recall(key);
    if (cached && !options?.refresh && isFresh(cached, Date.now())) {
      return answerFrom<T>(cached);
    }

    let value: T;
    try {
      value = await load();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        void remember(key, {
          outcome: "not-found",
          url: error.url,
          fetchedAtMs: Date.now(),
        });
        throw error;
      }
      if (cached && !options?.signal?.aborted) {
        return answerFrom<T>(cached);
      }
      throw error;
    }

    // Saved in the background: the reader already has the file, and a large
    // one (Psalm 119) can take a while to write on slow phone storage.
    void remember(key, { outcome: "found", value, fetchedAtMs: Date.now() });
    return value;
  };

  return {
    read<T>(
      key: string,
      load: () => Promise<T>,
      options?: DatasetCacheReadOptions
    ): Promise<T> {
      // A read that refreshes or can be cancelled settles differently from a
      // plain one, so only plain reads share. The API still shares the request
      // itself either way.
      if (options?.refresh || options?.signal) {
        return readThrough(key, load, options).finally(pruneOnce);
      }

      const existing = pending.get(key);
      if (existing) {
        return existing as Promise<T>;
      }
      const shared = readThrough(key, load).finally(() => {
        pending.delete(key);
        pruneOnce();
      });
      pending.set(key, shared);
      return shared;
    },
  };
}
