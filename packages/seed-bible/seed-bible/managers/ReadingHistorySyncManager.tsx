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

  /**
   * Why the last pass couldn't finish, or null when it did.
   *
   * Names every year that couldn't be reached, not just the last one to come
   * back: a pass can fail two years for two different reasons, and reporting
   * one of them hides the other.
   */
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

/** A year whose document a pass couldn't reach, and what it said. */
interface YearFailure {
  year: number;
  message: string;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  const pendingCountKnown = signal(true);

  // A queue that couldn't be read counts as at least one row rather than none.
  // The drain after a successful push is gated on this count, so answering zero
  // for a read that simply failed would leave a backlog waiting for an `online`
  // event that may never come.
  const pendingCount = computed(() =>
    pendingCountKnown.value
      ? pendingRows.value.length
      : Math.max(pendingRows.value.length, 1)
  );

  let running: Promise<void> | null = null;

  const refreshPendingCount = async (): Promise<void> => {
    // `store` is checked before the login signal is touched, so a device with
    // nowhere to queue never depends on the shape of what it was handed.
    if (!store) {
      pendingRows.value = [];
      pendingCountKnown.value = true;
      return;
    }
    const userId = login.userId.peek();
    if (!userId) {
      pendingRows.value = [];
      pendingCountKnown.value = true;
      return;
    }
    try {
      pendingRows.value = await store.listPending(userId);
      pendingCountKnown.value = true;
    } catch (error) {
      pendingCountKnown.value = false;
      console.warn("Failed to read pending reading events.", error);
    }
  };

  /**
   * Pushes everything pending for one user.
   *
   * Returns the years whose document couldn't be reached. Their rows keep their
   * `pendingOp`, so nothing is lost and the next pass tries again.
   */
  const runPass = async (userId: string): Promise<YearFailure[]> => {
    if (!store) {
      return [];
    }

    const pending = await store.listPending(userId);
    if (pending.length === 0) {
      return [];
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

    // Each year is a separate document with nothing to say to the others, so
    // they go out together rather than one after another: a backlog spanning
    // three years drains in one round trip instead of three, which matters
    // because the tab can close again part-way through the drain.
    const outcomes = await Promise.all(
      [...byYear].map(async ([year, rows]): Promise<YearFailure | null> => {
        try {
          await writeEvents(userId, year, rows.map(toReadingEvent));
          await store.markSynced(
            rows.map((row) => ({ key: row.key, end: row.end }))
          );
          return null;
        } catch (error) {
          console.warn(
            `Failed to replay reading history for ${year}. It stays queued.`,
            error
          );
          return { year, message: describeError(error) };
        }
      })
    );

    return outcomes.filter((outcome): outcome is YearFailure => !!outcome);
  };

  const sync = (): Promise<void> => {
    // A pass is already covering this; joining it is enough.
    if (running) {
      return running;
    }

    if (!store) {
      return Promise.resolve();
    }
    const userId = login.userId.peek();
    if (!userId || !isOnline.peek()) {
      return Promise.resolve();
    }

    isSyncing.value = true;
    running = (async () => {
      try {
        const failures = await runPass(userId);
        lastError.value =
          failures.length === 0
            ? null
            : failures
                .map((failure) => `${failure.year}: ${failure.message}`)
                .join("; ");

        // Pruning runs whether or not every year got through. It only ever
        // deletes rows the server already has — anything still queued is left
        // alone — so a year that can never be reached again must not be able to
        // switch pruning off: that would let every *other* year's synced rows
        // pile up forever, which is the one job pruning exists to do.
        try {
          await store.prune(userId, nowSeconds() - retentionSeconds);
        } catch (error) {
          // Local housekeeping, not a failed push. Reporting it through
          // `lastError` would claim reading history hadn't reached the server
          // when it had.
          console.warn("Failed to prune synced reading events.", error);
        }
      } catch (error) {
        lastError.value = describeError(error);
        console.warn("Reading history sync pass failed.", error);
      } finally {
        isSyncing.value = false;
        await refreshPendingCount();
        // Cleared last. A `sync()` arriving while the count is still being
        // re-read has to join this pass; clearing it any earlier lets a second
        // pass start and push the same rows again.
        running = null;
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
      pendingCountKnown.value = true;
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
