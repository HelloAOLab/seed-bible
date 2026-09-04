/**
 * Local storage for reading events, so a chapter someone spent real time in is
 * recorded on this device before anything is sent to the server.
 *
 * ## Why this exists
 *
 * Reading events live in a Yjs shared document, one per user per calendar year.
 * That document is held in memory and only reaches disk by being synced over a
 * live websocket, so anything not yet on the wire when the tab closes — or when
 * iOS freezes and discards the PWA — is gone. The symptom is the *tail* of a
 * reading session going missing: chapters read early in the evening are there
 * the next morning, the last few are not.
 *
 * Writing here first turns that around. The event is durable the moment it is
 * recorded, and pushing it to the year document becomes a retry-until-it-lands
 * job rather than the only chance to save it.
 *
 * Rows are written a *stretch* at a time — "this chapter held the screen from
 * here to here" — which is the shape both writers already produce: the reader's
 * five-second tick credits the stretch since the last one, and audio playback
 * reports listening after the fact from how far its own clock advanced.
 *
 * ## The shape of a row
 *
 * One row per reading event, keyed by
 * `${userId}/${year}/${bookId}/${chapter}/${start}` — the same identity the
 * year document's copy of the event has. That is what makes a replay safe: the
 * push looks for that identity and extends the event it finds instead of adding
 * a second copy of it.
 *
 * Rows carry a `pendingOp` of `"append"` until the year document has them. As
 * in {@link ./OfflineAnnotationStore}, the index on `["userId", "pendingOp"]`
 * *is* the outbound queue — IndexedDB cannot index null, so a row drops out of
 * the index by being marked synced, with no second list to keep in step.
 *
 * Synced rows are kept rather than deleted, because they are also what lets the
 * Today screen show today's reading immediately instead of after a round trip.
 * {@link OfflineReadingHistoryStore.prune} is what stops them accumulating
 * forever.
 *
 * ## What this deliberately does not do
 *
 * None of the read-then-write conflict machinery annotations need appears here.
 * Appends to a CRDT array merge cleanly and `end` only ever moves forward, so
 * two devices recording the same chapter cannot produce an answer that has to be
 * chosen between — the later `end` simply wins.
 *
 * Rows mirror the default `reading_history` document only. Nothing in the app
 * writes reading events to a differently-named document, and the save path that
 * can name one falls back to talking to that document directly.
 */

import { requestToPromise, transactionToPromise } from "./indexedDbUtils";
import type { ReadingEvent } from "./ReadingHistoryManager";

export const READING_HISTORY_DB_NAME = "seed-bible-reading-history";
export const READING_HISTORY_DB_VERSION = 1;

const EVENTS_STORE = "events";
const CHAPTER_INDEX = "chapter";
const PENDING_INDEX = "pending";
const WINDOW_INDEX = "window";

/** What a row still needs doing to it. Only ever an append. */
export type ReadingHistoryPendingOp = "append";

/** How long a synced row is kept so history stays readable offline. */
export const DEFAULT_RETENTION_SECONDS = 400 * 24 * 60 * 60;

/** One reading event as this device recorded it, plus whether it has been pushed. */
export interface StoredReadingEvent {
  /** `${userId}/${year}/${bookId}/${chapter}/${start}`. */
  key: string;

  /** The account the event belongs to. Also the record its document lives in. */
  userId: string;

  /** The calendar (UTC) year whose document this event belongs in. */
  year: number;

  bookId: string;
  chapter: number;

  /** Unix seconds when the event started. Part of the event's identity. */
  start: number;

  /** Unix seconds of the last tick that fell inside this event. */
  end: number;

  /** `"append"` while the year document still needs this event; null once it has it. */
  pendingOp: ReadingHistoryPendingOp | null;
}

/** A stretch of time spent on one chapter. */
export interface RecordReadingSpanInput {
  userId: string;
  bookId: string;
  chapter: number;

  /** Unix seconds when the stretch began. */
  startSeconds: number;

  /** Unix seconds when the stretch ended. */
  endSeconds: number;

  /**
   * How long a gap may sit between an existing event and this stretch's start
   * for the two to count as one sitting.
   *
   * Judged from the stretch's *start*, not from the clock, so a long listen
   * still lands on the event it began. Keeping the same rule the year document
   * uses means a break for supper shows up as two sittings in both places.
   */
  joinThresholdSeconds: number;
}

/** Which pushed event a row is being marked synced against. */
export interface SyncedReadingEvent {
  key: string;

  /**
   * The `end` that was actually pushed.
   *
   * Checked against the stored row rather than trusted, because the five-second
   * tick can extend an event while its push is in flight. Clearing `pendingOp`
   * regardless would leave those extra seconds sitting locally with nothing left
   * to push them.
   */
  end: number;
}

export interface OfflineReadingHistoryStore {
  /**
   * Records a stretch of time spent on a chapter, extending the sitting it
   * continues when there is one.
   *
   * Returns the row as it now stands, so the caller can push exactly what was
   * stored.
   */
  recordReadingSpan(input: RecordReadingSpanInput): Promise<StoredReadingEvent>;

  /** Every row for a user whose `start` falls in `[startTime, endTime)`. */
  listForWindow(
    userId: string,
    startTime: number,
    endTime: number
  ): Promise<StoredReadingEvent[]>;

  /** Every row the year document still needs, oldest first. */
  listPending(userId: string): Promise<StoredReadingEvent[]>;

  /** Clears `pendingOp` on rows the document has, leaving any that moved on. */
  markSynced(events: readonly SyncedReadingEvent[]): Promise<void>;

  /** Drops synced rows that ended before `oldestEndSeconds`. Pending rows stay. */
  prune(userId: string, oldestEndSeconds: number): Promise<void>;

  /**
   * Drops an owner's synced rows, keeping anything still pending.
   *
   * Called on sign-out, for the same reason `OfflineAnnotationStore` does it:
   * synced rows can be fetched again, but a row that has never reached the
   * server is the only copy of that event in existence.
   */
  clearSynced(userId: string): Promise<void>;
}

/** The UTC year whose document an event at `atSeconds` belongs in. */
export function readingEventYear(atSeconds: number): number {
  return new Date(atSeconds * 1000).getUTCFullYear();
}

/**
 * The identity of an event within its year's document.
 *
 * Deliberately excludes `end`: that is the part that changes as reading
 * continues, and this is what a push matches on to find the event it should be
 * extending.
 */
export function readingEventIdentity(event: {
  userId: string;
  bookId: string;
  chapter: number;
  start: number;
}): string {
  return `${event.userId}/${event.bookId}/${event.chapter}/${event.start}`;
}

/** The primary key of a row. Its identity, scoped to the year's document. */
export function storedReadingEventKey(row: {
  userId: string;
  year: number;
  bookId: string;
  chapter: number;
  start: number;
}): string {
  return `${row.userId}/${row.year}/${row.bookId}/${row.chapter}/${row.start}`;
}

/** Strips the sync bookkeeping off a row. */
export function toReadingEvent(row: StoredReadingEvent): ReadingEvent {
  return {
    userId: row.userId,
    bookId: row.bookId,
    chapter: row.chapter,
    start: row.start,
    end: row.end,
  };
}

/**
 * Works out what a stretch of reading does to a chapter's rows: extend the
 * sitting it continues, or open a new one.
 *
 * Split out from the transaction so both store implementations share one
 * definition. Reports `changed: false` when the stretch moved nothing, so a row
 * the document already has is never re-queued for a push it does not need —
 * which is also why `end` is only ever raised, never lowered: a late-arriving
 * stretch must not shorten what another writer already recorded.
 */
export function extendOrCreateReadingRow(
  existing: readonly StoredReadingEvent[],
  input: RecordReadingSpanInput
): { row: StoredReadingEvent; changed: boolean } {
  const {
    userId,
    bookId,
    chapter,
    startSeconds,
    endSeconds,
    joinThresholdSeconds,
  } = input;
  const year = readingEventYear(endSeconds);
  const oldestEnd = startSeconds - joinThresholdSeconds;

  let recent: StoredReadingEvent | null = null;
  for (const row of existing) {
    if (row.end < oldestEnd) {
      continue;
    }
    if (!recent || row.start > recent.start) {
      recent = row;
    }
  }

  if (recent) {
    const end = Math.max(recent.end, endSeconds);
    if (end === recent.end) {
      return { row: recent, changed: false };
    }
    return { row: { ...recent, end, pendingOp: "append" }, changed: true };
  }

  const row: StoredReadingEvent = {
    key: storedReadingEventKey({
      userId,
      year,
      bookId,
      chapter,
      start: startSeconds,
    }),
    userId,
    year,
    bookId,
    chapter,
    start: startSeconds,
    end: endSeconds,
    pendingOp: "append",
  };
  return { row, changed: true };
}

/** Oldest event first, so a backlog replays in the order it was read. */
function sortByStart(rows: StoredReadingEvent[]): StoredReadingEvent[] {
  return [...rows].sort((a, b) => a.start - b.start);
}

/** Rows a `markSynced` call should actually clear `pendingOp` on. */
function shouldMarkSynced(
  row: StoredReadingEvent | undefined,
  pushedEnd: number
): row is StoredReadingEvent {
  return !!row && row.pendingOp !== null && row.end === pushedEnd;
}

/**
 * Creates the IndexedDB-backed store.
 *
 * Returns null when IndexedDB is unavailable — during server-side rendering, and
 * in browsers that block storage. Callers treat null as "this device can't hold
 * reading events locally" and fall back to writing straight to the year
 * document, which is the behaviour that existed before this store.
 *
 * Uses its own database rather than adding a store to `seed-bible-offline`, for
 * the reason spelled out in {@link ./OfflineAnnotationStore}: bumping that
 * database's version makes a tab still holding the old connection fire
 * `onblocked`, which its open path rejects on, breaking offline translations in
 * that tab.
 */
export function createIndexedDbReadingHistoryStore(): OfflineReadingHistoryStore | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let databasePromise: Promise<IDBDatabase> | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        READING_HISTORY_DB_NAME,
        READING_HISTORY_DB_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(EVENTS_STORE)) {
          const events = database.createObjectStore(EVENTS_STORE, {
            keyPath: "key",
          });
          events.createIndex(CHAPTER_INDEX, [
            "userId",
            "year",
            "bookId",
            "chapter",
          ]);
          // IndexedDB skips records whose indexed value is null, so this index
          // contains exactly the rows the year document still needs.
          events.createIndex(PENDING_INDEX, ["userId", "pendingOp"]);
          events.createIndex(WINDOW_INDEX, ["userId", "start"]);
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

  const recordReadingSpan = async (
    input: RecordReadingSpanInput
  ): Promise<StoredReadingEvent> => {
    const database = await openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);

    // Read inside the same read-write transaction as the write, so a second
    // stretch cannot land between the two and open a duplicate event for the
    // same chapter. A transaction stays alive across the await of its own
    // request.
    const existing = (await requestToPromise(
      store
        .index(CHAPTER_INDEX)
        .getAll(
          IDBKeyRange.only([
            input.userId,
            readingEventYear(input.endSeconds),
            input.bookId,
            input.chapter,
          ])
        )
    )) as StoredReadingEvent[];

    const { row, changed } = extendOrCreateReadingRow(existing, input);
    if (changed) {
      store.put(row);
    }
    await transactionToPromise(transaction);
    return row;
  };

  const listForWindow = async (
    userId: string,
    startTime: number,
    endTime: number
  ): Promise<StoredReadingEvent[]> => {
    const database = await openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readonly");
    const rows = (await requestToPromise(
      transaction
        .objectStore(EVENTS_STORE)
        .index(WINDOW_INDEX)
        .getAll(
          IDBKeyRange.bound([userId, startTime], [userId, endTime], false, true)
        )
    )) as StoredReadingEvent[];
    return sortByStart(rows);
  };

  const listPending = async (userId: string): Promise<StoredReadingEvent[]> => {
    const database = await openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readonly");
    const rows = (await requestToPromise(
      transaction
        .objectStore(EVENTS_STORE)
        .index(PENDING_INDEX)
        .getAll(IDBKeyRange.only([userId, "append"]))
    )) as StoredReadingEvent[];
    return sortByStart(rows);
  };

  const markSynced = async (
    events: readonly SyncedReadingEvent[]
  ): Promise<void> => {
    if (events.length === 0) {
      return;
    }
    const database = await openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);

    for (const event of events) {
      const row = (await requestToPromise(store.get(event.key))) as
        | StoredReadingEvent
        | undefined;
      if (shouldMarkSynced(row, event.end)) {
        store.put({ ...row, pendingOp: null });
      }
    }

    await transactionToPromise(transaction);
  };

  const prune = async (
    userId: string,
    oldestEndSeconds: number
  ): Promise<void> => {
    const database = await openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);

    // An event's `end` is never before its `start`, so bounding the scan by
    // `start` is a superset of what can be pruned — the `end` check below is
    // what actually decides.
    const rows = (await requestToPromise(
      store
        .index(WINDOW_INDEX)
        .getAll(IDBKeyRange.bound([userId], [userId, oldestEndSeconds]))
    )) as StoredReadingEvent[];

    for (const row of rows) {
      if (row.pendingOp === null && row.end < oldestEndSeconds) {
        store.delete(row.key);
      }
    }

    await transactionToPromise(transaction);
  };

  const clearSynced = async (userId: string): Promise<void> => {
    const database = await openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);
    const rows = (await requestToPromise(
      store
        .index(WINDOW_INDEX)
        .getAll(IDBKeyRange.bound([userId], [userId, Infinity]))
    )) as StoredReadingEvent[];

    for (const row of rows) {
      if (row.pendingOp === null) {
        store.delete(row.key);
      }
    }

    await transactionToPromise(transaction);
  };

  return {
    recordReadingSpan,
    listForWindow,
    listPending,
    markSynced,
    prune,
    clearSynced,
  };
}

/**
 * An in-memory store with the same semantics as the IndexedDB one.
 *
 * Used by tests (jsdom has no IndexedDB) and usable as a fallback anywhere
 * persistence isn't available but the code paths still need to work.
 */
export function createInMemoryReadingHistoryStore(): OfflineReadingHistoryStore {
  const rows = new Map<string, StoredReadingEvent>();

  /**
   * Synchronous so {@link OfflineReadingHistoryStore.recordReadingSpan} can read
   * and write without yielding.
   *
   * This store stands in for the IndexedDB one in tests, so it has to share its
   * atomicity: awaiting between the read and the write would reintroduce the gap
   * a second stretch could fall into and open a duplicate event in.
   */
  const rowsForChapter = (
    userId: string,
    year: number,
    bookId: string,
    chapter: number
  ): StoredReadingEvent[] =>
    [...rows.values()].filter(
      (row) =>
        row.userId === userId &&
        row.year === year &&
        row.bookId === bookId &&
        row.chapter === chapter
    );

  return {
    async recordReadingSpan(input) {
      const existing = rowsForChapter(
        input.userId,
        readingEventYear(input.endSeconds),
        input.bookId,
        input.chapter
      );
      const { row, changed } = extendOrCreateReadingRow(existing, input);
      if (changed) {
        rows.set(row.key, row);
      }
      return row;
    },

    async listForWindow(userId, startTime, endTime) {
      return sortByStart(
        [...rows.values()].filter(
          (row) =>
            row.userId === userId &&
            row.start >= startTime &&
            row.start < endTime
        )
      );
    },

    async listPending(userId) {
      return sortByStart(
        [...rows.values()].filter(
          (row) => row.userId === userId && row.pendingOp !== null
        )
      );
    },

    async markSynced(events) {
      for (const event of events) {
        const row = rows.get(event.key);
        if (shouldMarkSynced(row, event.end)) {
          rows.set(row.key, { ...row, pendingOp: null });
        }
      }
    },

    async prune(userId, oldestEndSeconds) {
      for (const row of [...rows.values()]) {
        if (
          row.userId === userId &&
          row.pendingOp === null &&
          row.end < oldestEndSeconds
        ) {
          rows.delete(row.key);
        }
      }
    },

    async clearSynced(userId) {
      for (const row of [...rows.values()]) {
        if (row.userId === userId && row.pendingOp === null) {
          rows.delete(row.key);
        }
      }
    },
  };
}
