/**
 * Local storage for a feature's records, so they can be written, edited and
 * deleted with no connection and pushed to the server later.
 *
 * Two things live here, in one object store:
 *
 * - A **mirror** of the records this device knows about, so a collection's
 *   entries are readable (and editable) offline.
 * - The **sync state** of each of those rows: what still needs pushing, and
 *   which server version the local copy was derived from.
 *
 * Keeping both on one row, rather than a mirror plus a separate outbox, is
 * deliberate. IndexedDB cannot index `null`, so rows with `pendingOp: null`
 * drop out of the `pending` index on their own — the index *is* the queue,
 * with nothing to keep in step with the mirror. It also means repeated offline
 * edits to one record simply overwrite each other (there is never a stack of
 * deltas to replay), and a record created and then deleted while offline can
 * be dropped outright because its row proves it never reached the server.
 *
 * A second store records which collections have been listed from the server.
 * That is what separates "this collection has no records" from "we have never
 * fetched this collection" — without it, an offline visit is indistinguishable
 * from an empty collection, which is the bug that makes a feature keep
 * showing an empty list forever instead of ever trying the server again.
 *
 * Every feature gets its own database, one store per feature: two features
 * sharing a database means bumping its version for one of them fires
 * `onblocked` in any tab still holding the old connection to the other,
 * breaking a feature that didn't change. A database per feature costs nothing
 * and cannot regress a shipped one.
 *
 * Everything goes through the {@link OfflineRecordStore} interface so callers
 * never touch IndexedDB directly, which is also what lets tests swap in
 * {@link createInMemoryRecordStore}.
 */

import { requestToPromise, transactionToPromise } from "./indexedDbUtils";

/**
 * The owner used for records written while signed out.
 *
 * Not a real account id, so it can never collide with one: CasualOS user ids
 * are UUIDs. Rows under this owner are never pushed to the server — there is
 * no record to push them to — and are re-keyed to the real account by
 * {@link OfflineRecordStore.adoptLocalRows} on first sign-in.
 */
export const LOCAL_OWNER = "local";

/**
 * How many times a push is retried against a server that keeps reporting a
 * retryable failure before the row is left alone and surfaced as an error.
 * Without a cap, a row the server will never accept is retried on every
 * reconnect forever.
 */
export const MAX_SYNC_ATTEMPTS = 5;

/**
 * Shared by every domain's database. Version 1 was the annotations-only
 * schema; any database opened at version 1 is that legacy one and is migrated.
 */
export const RECORD_DB_VERSION = 2;

const RECORDS_STORE = "records";
const LISTED_STORE = "listed";
const COLLECTION_INDEX = "collection";
const PENDING_INDEX = "pending";
const LEGACY_RECORDS_STORE = "annotations";
const LEGACY_LISTED_STORE = "chapters";

/** What a row still needs pushed to the server. */
export type PendingOp = "upsert" | "delete";

/** One record as this device knows it, plus what the server still needs. */
export interface StoredRecord<T> {
  /** `${owner}/${address}`. */
  key: string;
  /** The account this belongs to, or {@link LOCAL_OWNER} while signed out. */
  owner: string;
  /** The CasualOS record address. */
  address: string;
  /** What `listForCollection` groups by; a chapter for annotations, the address itself for highlights. */
  collection: string;
  /** The local truth. Null once this row is a tombstone. */
  payload: T | null;
  /**
   * The server version this local state was derived from, or null when it has
   * never existed on the server. This is the conflict-detection base: the
   * question asked is "does the server still hold what I edited?", not "whose
   * timestamp is larger", because timestamps come from whichever device made
   * the edit and two devices' clocks need not agree.
   */
  base: T | null;
  /**
   * True when the record was deleted locally. The row outlives the record
   * because the deletion itself may still need pushing, and because erasing a
   * CasualOS record leaves nothing behind to distinguish "deleted" from
   * "never existed".
   */
  deleted: boolean;
  /** When the local change was made. The tombstone's time when `deleted`. */
  updatedAtMs: number;
  /** What still needs pushing. Null once the server matches this row. */
  pendingOp: PendingOp | null;
  /** Failed push attempts, so a row the server keeps rejecting stops retrying. */
  attempts: number;
}

/** Records that a collection's full list has been read from the server. */
export interface StoredCollection {
  /** `${owner}/${collection}`. */
  key: string;
  owner: string;
  collection: string;
  /** When the list was last read. */
  listedAtMs: number;
}

/** One record as the server holds it. */
export interface ServerRecord<T> {
  address: string;
  payload: T;
}

/**
 * What a feature has to say about its records for the engine to sync them.
 * One object per feature; the engine never imports feature code.
 */
export interface SyncDomain<T> {
  dbName: string;
  /** Validates a value read from the server. Null means "not one of ours". */
  parse(value: unknown): T | null;
  /** Whether two server versions are the same version. */
  sameVersion(a: T, b: T): boolean;
  collection(address: string, payload: T): string;
  marker(address: string, payload: T): string;
  /**
   * Resolves a row whose base no longer matches the server without asking the
   * user. Absent, the engine raises a conflict instead. Returning null means
   * "the record should not exist".
   */
  merge?(base: T | null, local: T | null, server: T | null): T | null;
  /** Makes a copy under a fresh address, for the "keep both" conflict choice. */
  duplicate?(payload: T): ServerRecord<T>;
}

export interface OfflineRecordStore<T> {
  /** Every row for a collection, tombstones included, so callers can filter them. */
  listForCollection(
    owner: string,
    collection: string
  ): Promise<StoredRecord<T>[]>;

  /** One row, or null if this device has never seen that record. */
  get(owner: string, address: string): Promise<StoredRecord<T> | null>;

  /** Writes a row, replacing any existing one. */
  put(record: StoredRecord<T>): Promise<void>;

  /** Removes a row entirely — not a tombstone, no trace left. */
  delete(owner: string, address: string): Promise<void>;

  /** Every row still waiting to be pushed, oldest change first. */
  listPending(owner: string): Promise<StoredRecord<T>[]>;

  /** The collection's list metadata, or null when it has never been listed. */
  getListed(
    owner: string,
    collection: string
  ): Promise<StoredCollection | null>;

  /**
   * Folds a server list into the mirror and marks the collection as listed.
   *
   * Pending rows are left exactly as they are: they hold changes the server
   * has not seen, so the server's copy is not newer information about them,
   * and deciding between the two is the sync pass's job. Everything else is
   * brought in line with the server, including dropping rows the server no
   * longer has (deleted on another device).
   */
  reconcileCollection(
    owner: string,
    collection: string,
    serverRecords: ServerRecord<T>[],
    listedAtMs: number
  ): Promise<void>;

  /**
   * Re-keys every {@link LOCAL_OWNER} row to `owner` and returns them.
   *
   * Used when someone who wrote records while signed out signs in: the
   * records become that account's. The move and the clear happen in one
   * transaction so the records cannot be adopted twice — otherwise a second
   * account signing in on the same (possibly shared) device would inherit
   * them, which is the leak `LoginManager` already guards against for
   * anonymous settings.
   */
  adoptLocalRows(owner: string): Promise<StoredRecord<T>[]>;

  /**
   * Drops an owner's fully-synced rows, keeping anything still pending.
   *
   * Called on sign-out. Synced records can be fetched again, and leaving
   * readable content on a shared device is the thing clearing the profile
   * cache exists to prevent — but deleting writing that has never reached the
   * server would be data loss, so those rows stay.
   */
  clearSynced(owner: string): Promise<void>;
}

export function recordKey(owner: string, address: string): string {
  return `${owner}/${address}`;
}

function collectionKey(owner: string, collection: string): string {
  return `${owner}/${collection}`;
}

/**
 * Builds the row for a record that matches the server exactly.
 *
 * Used both when a push succeeds and when a server list is folded in, so the
 * base pointers are always set the same way in both places.
 */
export function syncedRow<T>(
  owner: string,
  address: string,
  collection: string,
  payload: T
): StoredRecord<T> {
  return {
    key: recordKey(owner, address),
    owner,
    address,
    collection,
    payload,
    base: payload,
    deleted: false,
    updatedAtMs: 0,
    pendingOp: null,
    attempts: 0,
  };
}

/**
 * Serializes a value with object keys in sorted order, so two structurally
 * equal records always produce the same string.
 *
 * `JSON.stringify` preserves insertion order, which zod's parse does not
 * guarantee to match between a locally-built record and one read back from
 * the server. Sorting removes that as a source of false "changed" verdicts.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    // `undefined` and a missing key mean the same thing for an optional field,
    // so dropping them keeps the two spellings from hashing differently.
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
    .join(",")}}`;
}

/** The version-1 row shape, kept only so it can be migrated. */
interface LegacyStoredAnnotation {
  key: string;
  owner: string;
  annotationId: string;
  bookId: string;
  chapterNumber: number;
  annotation: unknown;
  deleted: boolean;
  updatedAtMs: number;
  baseUpdatedAtMs: number | null;
  baseFingerprint: string | null;
  pendingOp: PendingOp | null;
  attempts: number;
}

interface LegacyStoredChapter {
  key: string;
  owner: string;
  bookId: string;
  chapterNumber: number;
  listedAtMs: number;
}

/**
 * Version 1 kept two derived facts about the base instead of the base itself.
 * A non-null fingerprint or timestamp proves the server held a copy, and the
 * local annotation is the closest known version of it. With neither, the note
 * has never been on the server.
 *
 * Where v1 remembered the server's change time, it is put back on that copy —
 * the annotation carries the time of the *local* edit, so a base built from it
 * unchanged would never match what the server holds and every migrated pending
 * row would look edited elsewhere. A row that only ever had a fingerprint has
 * nothing to put back: if its note was edited offline, its first push asks the
 * user once. That is the whole residual cost of the migration.
 */
export function migrateV1Row(
  row: LegacyStoredAnnotation
): StoredRecord<unknown> {
  const hadServerCopy =
    row.baseFingerprint !== null || row.baseUpdatedAtMs !== null;
  return {
    key: row.key,
    owner: row.owner,
    address: row.annotationId,
    collection: `${row.bookId}/${row.chapterNumber}`,
    payload: row.annotation ?? null,
    base: hadServerCopy ? baseFromV1Row(row) : null,
    deleted: row.deleted,
    updatedAtMs: row.updatedAtMs,
    pendingOp: row.pendingOp,
    attempts: row.attempts,
  };
}

/** An annotation-shaped value, narrowed without importing the feature's type. */
function hasDataObject(
  value: unknown
): value is { data: Record<string, unknown> } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { data } = value as { data?: unknown };
  return typeof data === "object" && data !== null;
}

/** The local annotation, restamped with the server's change time when v1 kept one. */
function baseFromV1Row(row: LegacyStoredAnnotation): unknown {
  const annotation = row.annotation ?? null;
  if (row.baseUpdatedAtMs === null || !hasDataObject(annotation)) {
    return annotation;
  }
  return {
    ...annotation,
    data: { ...annotation.data, updatedAtMs: row.baseUpdatedAtMs },
  };
}

export function migrateV1Listed(row: LegacyStoredChapter): StoredCollection {
  const collection = `${row.bookId}/${row.chapterNumber}`;
  return {
    key: collectionKey(row.owner, collection),
    owner: row.owner,
    collection,
    listedAtMs: row.listedAtMs,
  };
}

/**
 * Creates the IndexedDB-backed store.
 *
 * Returns null when IndexedDB is unavailable — during server-side rendering,
 * and in browsers that block storage (private windows in some browsers, or a
 * sandboxed iframe). Callers treat null as "this device can't hold records
 * locally" and fall back to talking to the server directly.
 */
export function createIndexedDbRecordStore<T>(
  dbName: string
): OfflineRecordStore<T> | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let databasePromise: Promise<IDBDatabase> | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, RECORD_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = request.result;
        const upgrade = request.transaction;
        if (!database.objectStoreNames.contains(RECORDS_STORE)) {
          const records = database.createObjectStore(RECORDS_STORE, {
            keyPath: "key",
          });
          records.createIndex(COLLECTION_INDEX, ["owner", "collection"]);
          // IndexedDB skips records whose indexed value is null, so this index
          // contains exactly the rows that still need pushing.
          records.createIndex(PENDING_INDEX, ["owner", "pendingOp"]);
        }
        if (!database.objectStoreNames.contains(LISTED_STORE)) {
          database.createObjectStore(LISTED_STORE, { keyPath: "key" });
        }
        if (event.oldVersion === 1 && upgrade) {
          migrateLegacyStores(database, upgrade);
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

  const listForCollection = async (
    owner: string,
    collection: string
  ): Promise<StoredRecord<T>[]> => {
    const database = await openDatabase();
    const transaction = database.transaction(RECORDS_STORE, "readonly");
    const rows = await requestToPromise(
      transaction
        .objectStore(RECORDS_STORE)
        .index(COLLECTION_INDEX)
        .getAll(IDBKeyRange.only([owner, collection]))
    );
    return rows as StoredRecord<T>[];
  };

  const get = async (
    owner: string,
    address: string
  ): Promise<StoredRecord<T> | null> => {
    const database = await openDatabase();
    const transaction = database.transaction(RECORDS_STORE, "readonly");
    const row = await requestToPromise(
      transaction.objectStore(RECORDS_STORE).get(recordKey(owner, address))
    );
    return (row as StoredRecord<T> | undefined) ?? null;
  };

  const put = async (record: StoredRecord<T>): Promise<void> => {
    const database = await openDatabase();
    const transaction = database.transaction(RECORDS_STORE, "readwrite");
    transaction.objectStore(RECORDS_STORE).put(record);
    await transactionToPromise(transaction);
  };

  const deleteRow = async (owner: string, address: string): Promise<void> => {
    const database = await openDatabase();
    const transaction = database.transaction(RECORDS_STORE, "readwrite");
    transaction.objectStore(RECORDS_STORE).delete(recordKey(owner, address));
    await transactionToPromise(transaction);
  };

  const listPending = async (owner: string): Promise<StoredRecord<T>[]> => {
    const database = await openDatabase();
    const transaction = database.transaction(RECORDS_STORE, "readonly");
    const store = transaction.objectStore(RECORDS_STORE).index(PENDING_INDEX);
    const [upserts, deletes] = await Promise.all([
      requestToPromise(store.getAll(IDBKeyRange.only([owner, "upsert"]))),
      requestToPromise(store.getAll(IDBKeyRange.only([owner, "delete"]))),
    ]);
    return sortPending([
      ...(upserts as StoredRecord<T>[]),
      ...(deletes as StoredRecord<T>[]),
    ]);
  };

  const getListed = async (
    owner: string,
    collection: string
  ): Promise<StoredCollection | null> => {
    const database = await openDatabase();
    const transaction = database.transaction(LISTED_STORE, "readonly");
    const row = await requestToPromise(
      transaction
        .objectStore(LISTED_STORE)
        .get(collectionKey(owner, collection))
    );
    return (row as StoredCollection | undefined) ?? null;
  };

  const reconcileCollection = async (
    owner: string,
    collection: string,
    serverRecords: ServerRecord<T>[],
    listedAtMs: number
  ): Promise<void> => {
    const database = await openDatabase();
    const transaction = database.transaction(
      [RECORDS_STORE, LISTED_STORE],
      "readwrite"
    );
    const store = transaction.objectStore(RECORDS_STORE);

    // Read inside the same read-write transaction as the writes, not before it.
    // Reading separately left a gap the event loop could fill with a local edit,
    // and the decision about what to overwrite is made from `existing` — so an
    // edit landing in that gap looked unpending and got replaced by the server's
    // older copy, silently dropping it. A transaction stays alive across the
    // await of its own request, so this is still one atomic unit.
    const existing = (await requestToPromise(
      store
        .index(COLLECTION_INDEX)
        .getAll(IDBKeyRange.only([owner, collection]))
    )) as StoredRecord<T>[];

    applyReconcile(existing, serverRecords, owner, collection, {
      put: (row) => void store.put(row),
      delete: (key) => void store.delete(key),
    });

    transaction.objectStore(LISTED_STORE).put({
      key: collectionKey(owner, collection),
      owner,
      collection,
      listedAtMs,
    } satisfies StoredCollection);

    await transactionToPromise(transaction);
  };

  const adoptLocalRows = async (owner: string): Promise<StoredRecord<T>[]> => {
    const database = await openDatabase();
    const transaction = database.transaction(RECORDS_STORE, "readwrite");
    const store = transaction.objectStore(RECORDS_STORE);
    const rows = (await requestToPromise(store.getAll())) as StoredRecord<T>[];
    const { adopt, discard } = partitionLocalRows(rows);

    const adopted = adopt.map((row) => adoptRow(row, owner));
    for (const row of discard) {
      store.delete(row.key);
    }
    for (const row of adopted) {
      store.put(row);
    }

    await transactionToPromise(transaction);
    return adopted;
  };

  const clearSynced = async (owner: string): Promise<void> => {
    const database = await openDatabase();
    const transaction = database.transaction(RECORDS_STORE, "readwrite");
    const store = transaction.objectStore(RECORDS_STORE);
    const rows = (await requestToPromise(store.getAll())) as StoredRecord<T>[];
    for (const row of rows) {
      if (row.owner === owner && row.pendingOp === null) {
        store.delete(row.key);
      }
    }
    await transactionToPromise(transaction);
  };

  return {
    listForCollection,
    get,
    put,
    delete: deleteRow,
    listPending,
    getListed,
    reconcileCollection,
    adoptLocalRows,
    clearSynced,
  };
}

/**
 * Copies the version-1 annotation rows into the generic stores and drops the
 * old ones. Runs inside the upgrade transaction, which can see every store, so
 * it is atomic with the schema change: a tab that loses power mid-upgrade
 * reopens at version 1 and migrates again.
 */
function migrateLegacyStores(
  database: IDBDatabase,
  upgrade: IDBTransaction
): void {
  const records = upgrade.objectStore(RECORDS_STORE);
  const listed = upgrade.objectStore(LISTED_STORE);

  if (database.objectStoreNames.contains(LEGACY_RECORDS_STORE)) {
    const cursor = upgrade.objectStore(LEGACY_RECORDS_STORE).openCursor();
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) {
        database.deleteObjectStore(LEGACY_RECORDS_STORE);
        return;
      }
      records.put(migrateV1Row(current.value as LegacyStoredAnnotation));
      current.continue();
    };
  }

  if (database.objectStoreNames.contains(LEGACY_LISTED_STORE)) {
    const cursor = upgrade.objectStore(LEGACY_LISTED_STORE).openCursor();
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) {
        database.deleteObjectStore(LEGACY_LISTED_STORE);
        return;
      }
      listed.put(migrateV1Listed(current.value as LegacyStoredChapter));
      current.continue();
    };
  }
}

/** Oldest local change first, so a burst of offline edits pushes in order. */
function sortPending<T>(rows: StoredRecord<T>[]): StoredRecord<T>[] {
  return [...rows].sort((a, b) => a.updatedAtMs - b.updatedAtMs);
}

/**
 * Moves a signed-out row onto a real account.
 *
 * The base is always null: this content was written with no account, so it has
 * never been reconciled against any server copy, whatever the account itself
 * happens to have stored for the same address. A null base makes the push a
 * create for a domain with no merge, and a union merge for one that has it —
 * either way the server's version is looked at before anything overwrites it.
 */
function adoptRow<T>(row: StoredRecord<T>, owner: string): StoredRecord<T> {
  return {
    ...row,
    key: recordKey(owner, row.address),
    owner,
    base: null,
    pendingOp: "upsert",
    attempts: 0,
  };
}

/**
 * Splits signed-out rows into the ones worth adopting and the ones to discard.
 *
 * A tombstone written while signed out refers to a record that only ever
 * existed on this device, so there is nothing on the server to delete and
 * nothing to adopt — carrying it onto the account would just leave a
 * permanent dead row.
 */
function partitionLocalRows<T>(rows: StoredRecord<T>[]): {
  adopt: StoredRecord<T>[];
  discard: StoredRecord<T>[];
} {
  const local = rows.filter((row) => row.owner === LOCAL_OWNER);
  return {
    adopt: local.filter((row) => !row.deleted),
    discard: local,
  };
}

/**
 * Works out the row changes that bring a collection in line with a server
 * list, and hands them to a writer.
 *
 * Split out from the transaction so both store implementations share one
 * definition of what reconciliation means.
 */
function applyReconcile<T>(
  existing: StoredRecord<T>[],
  serverRecords: ServerRecord<T>[],
  owner: string,
  collection: string,
  writer: { put: (row: StoredRecord<T>) => void; delete: (key: string) => void }
): void {
  const byAddress = new Map(existing.map((row) => [row.address, row]));
  const serverAddresses = new Set(serverRecords.map((r) => r.address));

  for (const record of serverRecords) {
    const row = byAddress.get(record.address);
    // A pending row holds a change the server hasn't seen. The server's copy
    // isn't newer information about it, and choosing between them is the sync
    // pass's job, so leave it untouched.
    if (row?.pendingOp) {
      continue;
    }
    writer.put(syncedRow(owner, record.address, collection, record.payload));
  }

  for (const row of existing) {
    if (serverAddresses.has(row.address) || row.pendingOp) {
      continue;
    }
    // Synced locally but gone from the server: deleted on another device.
    writer.delete(row.key);
  }
}

/**
 * An in-memory store with the same semantics as the IndexedDB one.
 *
 * Used by tests (jsdom has no IndexedDB) and usable as a fallback anywhere
 * persistence isn't available but the code paths still need to work.
 */
export function createInMemoryRecordStore<T>(): OfflineRecordStore<T> {
  const rows = new Map<string, StoredRecord<T>>();
  const collections = new Map<string, StoredCollection>();

  /**
   * Synchronous so {@link reconcileCollection} can read and write without
   * yielding.
   *
   * That matters for more than tidiness: this store stands in for the
   * IndexedDB one in tests, so it has to share its atomicity. Awaiting
   * between the read and the writes would reintroduce the very gap a
   * concurrent local edit used to fall into and get overwritten in.
   */
  const rowsForCollection = (
    owner: string,
    collection: string
  ): StoredRecord<T>[] =>
    [...rows.values()].filter(
      (row) => row.owner === owner && row.collection === collection
    );

  const listForCollection = async (
    owner: string,
    collection: string
  ): Promise<StoredRecord<T>[]> => rowsForCollection(owner, collection);

  return {
    listForCollection,

    async get(owner, address) {
      return rows.get(recordKey(owner, address)) ?? null;
    },

    async put(record) {
      rows.set(record.key, record);
    },

    async delete(owner, address) {
      rows.delete(recordKey(owner, address));
    },

    async listPending(owner) {
      return sortPending(
        [...rows.values()].filter(
          (row) => row.owner === owner && row.pendingOp !== null
        )
      );
    },

    async getListed(owner, collection) {
      return collections.get(collectionKey(owner, collection)) ?? null;
    },

    async reconcileCollection(owner, collection, serverRecords, listedAtMs) {
      const existing = rowsForCollection(owner, collection);
      applyReconcile(existing, serverRecords, owner, collection, {
        put: (row) => rows.set(row.key, row),
        delete: (key) => rows.delete(key),
      });
      collections.set(collectionKey(owner, collection), {
        key: collectionKey(owner, collection),
        owner,
        collection,
        listedAtMs,
      });
    },

    async adoptLocalRows(owner) {
      const all = [...rows.values()];
      const { adopt, discard } = partitionLocalRows(all);
      const adopted = adopt.map((row) => adoptRow(row, owner));
      for (const row of discard) {
        rows.delete(row.key);
      }
      for (const row of adopted) {
        rows.set(row.key, row);
      }
      return adopted;
    },

    async clearSynced(owner) {
      for (const row of [...rows.values()]) {
        if (row.owner === owner && row.pendingOp === null) {
          rows.delete(row.key);
        }
      }
    },
  };
}
