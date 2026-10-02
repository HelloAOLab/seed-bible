import { signal, type Signal } from "@preact/signals";

/**
 * How old a friend's cached content can get before it's read again: 30
 * seconds. This is a minimum gap between reads, not a timer — nothing is
 * read while content just sits on screen.
 */
export const FRIEND_CONTENT_MAX_AGE_MS = 30 * 1000;

/** Whether content last read at `loadedAtMs` is due to be read again. */
export function isFriendContentStale(
  loadedAtMs: number | null,
  nowMs = Date.now()
): boolean {
  return loadedAtMs !== null && nowMs - loadedAtMs >= FRIEND_CONTENT_MAX_AGE_MS;
}

/**
 * Keeps friends' cached content (their notes, playlists, reading plans)
 * reasonably fresh without polling. Nothing tells the app when a friend saves
 * something, so content is read again at the two moments someone is likely
 * to look for changes: when it comes back on screen (returning to a chapter,
 * reopening a section), and when the app regains focus while it's showing.
 * Each manager decides what "stale" means and how to read again; this only
 * knows what's on screen.
 */
export function createFriendContentFreshness() {
  // The refresh callback of every friend signal something is watching.
  const onScreen = new Set<() => void>();

  if (typeof window !== "undefined") {
    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      for (const refreshIfStale of onScreen) {
        refreshIfStale();
      }
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
  }

  /**
   * A signal holding one friend's cached content, which calls
   * `refreshIfStale` when it comes back on screen and when the app regains
   * focus while it's shown.
   */
  const trackedSignal = <T>(
    initial: T,
    refreshIfStale: () => void
  ): Signal<T> =>
    signal(initial, {
      watched() {
        onScreen.add(refreshIfStale);
        // Deferred: this runs while a render or computed is subscribing, which
        // is no place to start a load that writes signals.
        queueMicrotask(refreshIfStale);
      },
      unwatched() {
        onScreen.delete(refreshIfStale);
      },
    });

  return { trackedSignal };
}
