/**
 * Replays locally-recorded reading events into their year documents.
 *
 * The five-second tick that records a chapter already tries to push it straight
 * away, so in the ordinary case this has nothing to do. It exists for the case
 * that used to lose reading outright: the push failed — no connection, a dropped
 * websocket, an expired session key — and the page then went away before it
 * could be retried. The event survived in
 * {@link ./OfflineReadingHistoryStore}, and this is what carries it across on
 * the next load or the next reconnect.
 *
 * ## Why there is no attempt cap
 *
 * `AnnotationSyncManager` gives up on a row after
 * {@link ./OfflineAnnotationStore.MAX_SYNC_ATTEMPTS} tries, because the failures
 * it retries are the server refusing a *particular* note — retrying that on
 * every reconnect burns battery for nothing.
 *
 * Nothing here can fail that way. A reading event has no content the server can
 * object to; the only thing that goes wrong is not reaching the year document at
 * all, which is a property of the connection and not of the event. So a cap
 * would only ever throw away genuine reading — exactly what this whole mechanism
 * exists to stop — and passes only run on sign-in and reconnect, which are not
 * frequent enough to need one.
 */

import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "./LoginManager";
import type { ReadingEvent } from "./ReadingHistoryManager";
import {
  DEFAULT_RETENTION_SECONDS,
  toReadingEvent,
  type OfflineReadingHistoryStore,
  type StoredReadingEvent,
} from "./OfflineReadingHistoryStore";

export interface ReadingHistorySyncManager {
  /** Whether the browser currently reports a connection. */
  isOnline: ReadonlySignal<boolean>;

  /** True while a pass is in flight. */
  isSyncing: ReadonlySignal<boolean>;

  /** How many recorded events the server still doesn't have. */
  pendingCount: ReadonlySignal<number>;

  /** Why the last pass couldn't finish, or null when it did. */
  lastError: ReadonlySignal<string | null>;

  /** Runs a pass, or joins the one already running. */
  sync: () => Promise<void>;

  /** Re-reads the pending queue into {@link pendingCount}. */
  refreshPendingCount: () => Promise<void>;

  /** Removes the window listeners and stops watching the signed-in user. */
  dispose: () => void;
}

export interface CreateReadingHistorySyncManagerOptions {
  login: LoginManager;

  /** Where events are recorded. Null disables replaying entirely. */
  store: OfflineReadingHistoryStore | null;

  /**
   * Pushes a year's events into that year's document.
   *
   * Injected rather than imported so this module needs nothing at runtime from
   * `ReadingHistoryManager`, which constructs it — otherwise the two would
   * import each other.
   */
  writeEvents: (
    recordName: string,
    year: number,
    events: readonly ReadingEvent[]
  ) => Promise<void>;

  /**
   * How long a synced row is kept for reading history offline. Defaults to
   * {@link DEFAULT_RETENTION_SECONDS}.
   */
  retentionSeconds?: number;

  /** Injected in tests. Defaults to the wall clock. */
  nowSeconds?: () => number;
}

export function createReadingHistorySyncManager(
  options: CreateReadingHistorySyncManagerOptions
): ReadingHistorySyncManager {
  const {
    login,
    store,
    writeEvents,
    retentionSeconds = DEFAULT_RETENTION_SECONDS,
    nowSeconds = () => Math.floor(Date.now() / 1000),
  } = options;

  const isOnline = signal<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const isSyncing = signal(false);
  const pendingRows = signal<StoredReadingEvent[]>([]);
  const lastError = signal<string | null>(null);

  const pendingCount = computed(() => pendingRows.value.length);

  let running: Promise<void> | null = null;

  const refreshPendingCount = async (): Promise<void> => {
    const userId = login.userId.peek();
    if (!store || !userId) {
      pendingRows.value = [];
      return;
    }
    try {
      pendingRows.value = await store.listPending(userId);
    } catch (error) {
      console.warn("Failed to read pending reading events.", error);
    }
  };

  /**
   * Pushes everything pending for one user.
   *
   * Returns false when a year's document couldn't be reached. Its rows keep
   * their `pendingOp`, so nothing is lost and the next pass tries again.
   */
  const runPass = async (userId: string): Promise<boolean> => {
    if (!store) {
      return true;
    }

    const pending = await store.listPending(userId);
    if (pending.length === 0) {
      return true;
    }

    const byYear = new Map<number, StoredReadingEvent[]>();
    for (const row of pending) {
      const rows = byYear.get(row.year);
      if (rows) {
        rows.push(row);
      } else {
        byYear.set(row.year, [row]);
      }
    }

    let completed = true;
    for (const [year, rows] of byYear) {
      try {
        await writeEvents(userId, year, rows.map(toReadingEvent));
        await store.markSynced(
          rows.map((row) => ({ key: row.key, end: row.end }))
        );
      } catch (error) {
        lastError.value =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `Failed to replay reading history for ${year}. It stays queued.`,
          error
        );
        completed = false;
      }
    }

    return completed;
  };

  const sync = (): Promise<void> => {
    // A pass is already covering this; joining it is enough.
    if (running) {
      return running;
    }

    const userId = login.userId.peek();
    if (!store || !userId || !isOnline.peek()) {
      return Promise.resolve();
    }

    isSyncing.value = true;
    running = (async () => {
      try {
        const completed = await runPass(userId);

        if (completed) {
          lastError.value = null;
          // Only once everything has landed, so pruning can never remove the
          // local copy of an event the server still doesn't have.
          await store.prune(userId, nowSeconds() - retentionSeconds);
        }
      } catch (error) {
        lastError.value =
          error instanceof Error ? error.message : String(error);
        console.warn("Reading history sync pass failed.", error);
      } finally {
        running = null;
        isSyncing.value = false;
        await refreshPendingCount();
      }
    })();

    return running;
  };

  const handleOnline = () => {
    isOnline.value = true;
    void sync();
  };
  const handleOffline = () => {
    isOnline.value = false;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  // Drains on the first resolution of `userId` (app start with a stored
  // session) and on every later sign-in.
  let lastUserId: string | null | undefined;
  const disposeUserWatch = effect(() => {
    const userId = login.userId.value;
    if (userId === lastUserId) {
      return;
    }
    const previous = lastUserId;
    lastUserId = userId;

    if (!store) {
      return;
    }

    if (!userId) {
      // Signing out: keep events the server hasn't seen, drop the rest so a
      // shared device isn't left holding somebody's reading history.
      if (previous) {
        void store.clearSynced(previous).catch((error: unknown) => {
          console.warn("Failed to clear synced reading events.", error);
        });
      }
      pendingRows.value = [];
      return;
    }

    void (async () => {
      await refreshPendingCount();
      void sync();
    })();
  });

  const dispose = () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
    disposeUserWatch();
  };

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastError,
    sync,
    refreshPendingCount,
    dispose,
  };
}
