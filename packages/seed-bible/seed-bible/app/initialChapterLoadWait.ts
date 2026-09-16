/**
 * How long the client waits for the initial chapter loads before mounting
 * anyway. Generous on purpose: the point is not to race a slow connection
 * (a slow-but-progressing load should still be waited for, so the first
 * paint keeps the SSR content instead of flashing a fallback) but to bound
 * a load that has genuinely stalled — connection open, response never
 * completing — which would otherwise leave the app unmounted, and therefore
 * completely uninteractive, forever.
 */
export const INITIAL_CHAPTER_LOAD_TIMEOUT_MS = 8000;

export type InitialChapterLoadWaitResult = "settled" | "timed-out";

/**
 * Waits for every initial tab's chapter load, but never longer than
 * `timeoutMs`.
 *
 * The caller must treat `"timed-out"` as "do not hydrate": the SSR markup on
 * screen was produced from content this client hasn't finished loading, so
 * the first client render can't be guaranteed to match it, and Preact's
 * `hydrate()` doesn't diff attributes on existing DOM — a mismatch would
 * silently stay wrong. A full `render()` rebuilds and self-corrects instead.
 *
 * @param promises the in-flight chapter-load promises. These never reject
 * (`BibleReadingManager` settles `chapterDataPromise` on failure too), but
 * a rejection is treated as settled rather than propagated regardless — a
 * failed load is still an answer, and the mount must not hang on it.
 * @param timeoutMs how long to wait before giving up.
 */
export function waitForInitialChapterLoads(
  promises: Promise<unknown>[],
  timeoutMs: number = INITIAL_CHAPTER_LOAD_TIMEOUT_MS
): Promise<InitialChapterLoadWaitResult> {
  if (promises.length === 0) {
    return Promise.resolve("settled");
  }

  return new Promise<InitialChapterLoadWaitResult>((resolve) => {
    const timer = setTimeout(() => resolve("timed-out"), timeoutMs);
    void Promise.allSettled(promises).then(() => {
      clearTimeout(timer);
      resolve("settled");
    });
  });
}
