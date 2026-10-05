import { signal, type Signal } from "@preact/signals";

/**
 * How old a friend's cached content can get before it's read again: 30
 * seconds. This is a minimum gap between reads, not a timer — nothing is
 * read while content just sits on screen.
 */
export const FRIEND_CONTENT_MAX_AGE_MS = 30 * 1000;

/**
 * How many reads of friends' content run at once: 4. Opening a chapter reads
 * every friend's notes on it, so without a limit the request count grows with
 * the friends list, and the user's own reads queue behind them.
 */
export const MAX_CONCURRENT_FRIEND_READS = 4;

/** Whether content last read at `loadedAtMs` is due to be read again. */
export function isFriendContentStale(
  loadedAtMs: number | null,
  nowMs = Date.now()
): boolean {
  return loadedAtMs !== null && nowMs - loadedAtMs >= FRIEND_CONTENT_MAX_AGE_MS;
}

/**
 * The reason a read waiting for its turn was never made: what it was for left
 * the screen first (a chapter swiped past, say). Callers treat it as a failed
 * read, so it's made once that content is back on screen.
 */
export class SkippedFriendRead extends Error {
  constructor() {
    super("Skipped reading a friend's content that left the screen");
    this.name = "SkippedFriendRead";
  }
}

export type FriendReadLimiter = ReturnType<typeof createFriendReadLimiter>;

/**
 * Runs reads of friends' content at most `maxConcurrent` at a time, in the
 * order they were asked for. One limiter is shared by every manager that
 * reads friends' content, so the limit covers all of them together.
 */
export function createFriendReadLimiter(
  maxConcurrent = MAX_CONCURRENT_FRIEND_READS
) {
  let running = 0;
  const waiting: (() => void)[] = [];

  const startWaiting = () => {
    while (running < maxConcurrent && waiting.length > 0) {
      waiting.shift()!();
    }
  };

  /**
   * Runs `read` once there's room. A read that had to wait is skipped, with a
   * {@link SkippedFriendRead}, if `stillWanted` says no by the time its turn
   * comes. One with room straight away always runs: it was asked for during
   * the render that's about to show it.
   */
  const run = <T>(read: () => Promise<T>, stillWanted: () => boolean) =>
    new Promise<T>((resolve, reject) => {
      const start = (waited: boolean) => {
        if (waited && !stillWanted()) {
          reject(new SkippedFriendRead());
          return;
        }
        running++;
        Promise.resolve()
          .then(read)
          .then(resolve, reject)
          .finally(() => {
            running--;
            startWaiting();
          });
      };
      if (running < maxConcurrent) {
        start(false);
      } else {
        waiting.push(() => start(true));
      }
    });

  return { run };
}

/**
 * Keeps friends' cached content (their notes, playlists, reading plans)
 * reasonably fresh without polling. Nothing tells the app when a friend saves
 * something, so content is read again at the moments someone is likely to
 * look for changes, or a failed read could now work: when it comes back on
 * screen (returning to a chapter, reopening a section), and when the app
 * regains focus or its connection while it's showing.
 * Each manager decides what "stale" means and how to read again; this only
 * knows what's on screen.
 */
export function createFriendContentFreshness(
  limiter: FriendReadLimiter = createFriendReadLimiter()
) {
  // The refresh callback of every friend signal something is watching.
  const onScreen = new Set<() => void>();
  // The friend signals something is watching.
  const shown = new Set<Signal<unknown>>();

  /**
   * Reads again whatever is on screen and due for it: stale, or last read
   * failed. Content that isn't on screen waits until it is.
   */
  const refreshOnScreen = () => {
    for (const refreshIfStale of onScreen) {
      refreshIfStale();
    }
  };

  const refreshOnReturn = () => {
    if (document.visibilityState === "visible") {
      refreshOnScreen();
    }
  };

  // Listening only while something is shown: with nothing on screen there's
  // nothing to refresh, and a tracker nobody watches holds no listeners.
  const listenForReturn = (listen: boolean) => {
    if (typeof window === "undefined") {
      return;
    }
    if (listen) {
      window.addEventListener("focus", refreshOnReturn);
      window.addEventListener("online", refreshOnReturn);
      document.addEventListener("visibilitychange", refreshOnReturn);
    } else {
      window.removeEventListener("focus", refreshOnReturn);
      window.removeEventListener("online", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    }
  };

  /**
   * A signal holding one friend's cached content, which calls
   * `refreshIfStale` when it comes back on screen and when the app regains
   * focus or its connection while it's shown.
   */
  const trackedSignal = <T>(
    initial: T,
    refreshIfStale: () => void
  ): Signal<T> => {
    const content: Signal<T> = signal(initial, {
      watched() {
        onScreen.add(refreshIfStale);
        shown.add(content);
        if (shown.size === 1) {
          listenForReturn(true);
        }
        // Deferred: this runs while a render or computed is subscribing, which
        // is no place to start a load that writes signals.
        queueMicrotask(refreshIfStale);
      },
      unwatched() {
        onScreen.delete(refreshIfStale);
        shown.delete(content);
        if (shown.size === 0) {
          listenForReturn(false);
        }
      },
    });
    return content;
  };

  /**
   * Makes a read for the friend content `content` holds, within the shared
   * limit. Rejects with {@link SkippedFriendRead} if the content leaves the
   * screen while the read waits for its turn.
   */
  const read = <T>(content: Signal<unknown>, load: () => Promise<T>) =>
    limiter.run(load, () => shown.has(content));

  return { trackedSignal, read, refreshOnScreen };
}
