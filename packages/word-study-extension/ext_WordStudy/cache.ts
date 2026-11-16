import {
  requestToPromise,
  transactionToPromise,
} from "@packages/seed-bible/seed-bible/managers/indexedDbUtils";

/**
 * What the cache holds for one key: the file itself, or the fact that the API
 * answered 404 for it.
 */
export interface CachedRecord {
  value?: unknown;
  /** Set instead of `value` when the API has no such file. */
  outcome?: "not-found";
  fetchedAtMs: number;
}

interface StoredRecord extends CachedRecord {
  /** The key this record was stored under. */
  key: string;
}

export interface RecordStore {
  /** The cached record for a key, however old, or null when there is none. */
  get(key: string): Promise<CachedRecord | null>;

  put(key: string, record: CachedRecord): Promise<void>;

  /** Deletes every record fetched before `cutoffMs`. */
  prune(cutoffMs: number): Promise<void>;
}

const RECORDS_STORE = "records";

/**
 * Creates an IndexedDB-backed store in its own database.
 *
 * Returns null when IndexedDB is unavailable: during server-side rendering,
 * and in browsers that block storage (private windows in some browsers, or a
 * sandboxed iframe). Callers treat null as "no cache here" and fetch every
 * time, rather than failing.
 */
export function createIndexedDbRecordStore(
  databaseName: string
): RecordStore | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let databasePromise: Promise<IDBDatabase> | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(RECORDS_STORE)) {
          database.createObjectStore(RECORDS_STORE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };
        resolve(database);
      };

      request.onerror = () =>
        reject(request.error ?? new Error(`Failed to open ${databaseName}.`));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });

    return databasePromise;
  };

  return {
    async get(key: string): Promise<CachedRecord | null> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readonly");
      const record = await requestToPromise<StoredRecord | undefined>(
        transaction.objectStore(RECORDS_STORE).get(key)
      );
      return record ?? null;
    },

    async put(key: string, record: CachedRecord): Promise<void> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readwrite");
      transaction
        .objectStore(RECORDS_STORE)
        .put({ ...record, key } satisfies StoredRecord);
      await transactionToPromise(transaction);
    },

    async prune(cutoffMs: number): Promise<void> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readwrite");
      const cursorRequest = transaction.objectStore(RECORDS_STORE).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          return;
        }
        if ((cursor.value as StoredRecord).fetchedAtMs < cutoffMs) {
          cursor.delete();
        }
        cursor.continue();
      };
      await transactionToPromise(transaction);
    },
  };
}

/** A store that keeps records in memory only, standing in for IndexedDB in tests. */
export function createInMemoryRecordStore(): RecordStore & {
  records: Map<string, CachedRecord>;
} {
  const records = new Map<string, CachedRecord>();

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

/** What fetching a key from the network found. */
export type LoadResult = { found: true; value: unknown } | { found: false };

export interface CachedReaderOptions {
  /** Where records persist between sessions. Null reads straight from the network. */
  store: RecordStore | null;

  /** How long a fetched record is served before it is fetched again. */
  ttlMs: number;

  /** How long a "not found" answer is remembered before it is asked again. */
  notFoundTtlMs: number;

  /**
   * How long past `ttlMs` an expired record is kept on the device, as the
   * answer to give when the network is down. Older records are pruned at the
   * first read of a session.
   */
  keepStaleForMs: number;

  /** What a read of a key known not to exist rejects with. */
  notFoundError: (key: string) => Error;
}

export interface CachedReader {
  /**
   * The file at `key`, fetched with `load` when the device has no fresh copy.
   * `load` resolves `{ found: false }` for a 404 and throws for any other
   * failure (offline, a server error). Rejects with the reader's
   * `notFoundError` when the API has no such file, and with the network's
   * error when it can't be reached and nothing is cached.
   */
  read<T>(key: string, load: () => Promise<LoadResult>): Promise<T>;
}

/**
 * Reads read-only dataset files, keeping what it fetches.
 *
 * Three layers, cheapest first: an in-flight map so simultaneous callers share
 * one request, then `store` (IndexedDB, so the data survives a reload), then
 * the network. When the network fails, an expired record still on the device
 * is served rather than the error: old reference data beats none.
 *
 * A store read or write that throws is ignored rather than surfaced: storage
 * can be blocked or full, and reference data is never worth failing a render
 * over.
 */
export function createCachedReader(options: CachedReaderOptions): CachedReader {
  const { store, ttlMs, notFoundTtlMs, keepStaleForMs, notFoundError } =
    options;
  const inFlight = new Map<string, Promise<unknown>>();
  let hasPruned = false;

  const isFresh = (record: CachedRecord, nowMs: number) =>
    nowMs - record.fetchedAtMs <=
    (record.outcome === "not-found" ? notFoundTtlMs : ttlMs);

  const remember = async (
    key: string,
    record: Omit<CachedRecord, "fetchedAtMs">
  ) => {
    try {
      await store?.put(key, { ...record, fetchedAtMs: Date.now() });
    } catch {
      // A cache that won't accept writes still serves reads fine.
    }
  };

  const recall = async (key: string): Promise<CachedRecord | null> => {
    try {
      return (await store?.get(key)) ?? null;
    } catch {
      return null;
    }
  };

  /** The answer a stored record gives: its file, or a rejection for a 404. */
  const answerFrom = (key: string, record: CachedRecord): unknown => {
    if (record.outcome === "not-found") {
      throw notFoundError(key);
    }
    return record.value;
  };

  const readThrough = async (
    key: string,
    load: () => Promise<LoadResult>
  ): Promise<unknown> => {
    const cached = await recall(key);
    if (cached && isFresh(cached, Date.now())) {
      return answerFrom(key, cached);
    }

    let loaded: LoadResult;
    try {
      loaded = await load();
    } catch (error) {
      if (cached) {
        return answerFrom(key, cached);
      }
      throw error;
    }

    if (!loaded.found) {
      await remember(key, { outcome: "not-found" });
      throw notFoundError(key);
    }
    await remember(key, { value: loaded.value });
    return loaded.value;
  };

  return {
    async read<T>(key: string, load: () => Promise<LoadResult>): Promise<T> {
      if (store && !hasPruned) {
        // Expired records are otherwise only replaced when revisited, so the
        // ones that never are would stay on the device for good.
        hasPruned = true;
        void store
          .prune(Date.now() - ttlMs - keepStaleForMs)
          .catch(() => undefined);
      }

      const pending = inFlight.get(key);
      if (pending) {
        return (await pending) as T;
      }

      const request = readThrough(key, load);
      inFlight.set(key, request);
      try {
        return (await request) as T;
      } finally {
        inFlight.delete(key);
      }
    },
  };
}
