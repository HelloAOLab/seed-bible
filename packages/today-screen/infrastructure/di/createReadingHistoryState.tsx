import { signal, effect, type ReadonlySignal } from "@preact/signals";
import type {
  ReadingHistoryState,
  UserLastReading,
} from "@packages/today-screen/domain/models/readingHistory";

export interface ReadingHistoryStateDeps {
  /** The current user id, synchronously known from the cached session key. */
  userId: ReadonlySignal<string | null>;
  /**
   * Any signal whose changes should re-fetch the resume position (the user's
   * live reading state). Read only for its reactivity — the value is unused.
   */
  refetchTrigger: ReadonlySignal<unknown>;
  getUserLastReading: (
    userId: string,
    range: { from: number; to: number }
  ) => Promise<UserLastReading>;
}

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Owns the Today screen's reading-history gate. It derives the first-paint
 * branch from `userId` (known synchronously at startup), so a returning user
 * never flashes the Welcome page while their history loads:
 *
 * - `userId === null` → `empty` (Welcome), no fetch.
 * - `userId !== null` → `loading` (personalized placeholders), then reconcile
 *   to `ready` / `empty` when the fetch resolves.
 *
 * Cross-account safety: on every `userId` change the state resets to `loading`
 * (clearing the previous account's position before the new fetch resolves),
 * and any in-flight fetch whose userId is no longer current is ignored — so
 * account A's result can never overwrite account B's state. A same-user refetch
 * (reading progressed) keeps the current card visible while revalidating.
 *
 * The returned `dispose` tears down the internal effect.
 */
export function createReadingHistoryState(deps: ReadingHistoryStateDeps): {
  readingHistory: ReadonlySignal<ReadingHistoryState>;
  dispose: () => void;
} {
  const readingHistory = signal<ReadingHistoryState>({ status: "loading" });

  // The userId the effect last acted on. The initial `undefined` (never a real
  // value) forces the first run to be treated as a change.
  let lastSeenUserId: string | null | undefined = undefined;

  const dispose = effect(() => {
    const userId = deps.userId.value;
    // Re-run when reading progresses so the resume position stays fresh.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    deps.refetchTrigger.value;

    const userChanged = userId !== lastSeenUserId;
    lastSeenUserId = userId;

    if (!userId) {
      // Signed out: back to Welcome, dropping the previous account's position.
      readingHistory.value = { status: "empty" };
      return;
    }

    // Only clear to a placeholder when the account itself changed; a plain
    // reading-progress refetch keeps the current card visible (no flicker).
    if (userChanged) {
      readingHistory.value = { status: "loading" };
    }

    const requestedUserId = userId;
    const now = Math.floor(Date.now() / 1000);

    void deps
      .getUserLastReading(userId, { from: now - ONE_YEAR_SECONDS, to: now })
      .then((result) => {
        // Ignore a result for a user who is no longer current.
        if (deps.userId.peek() !== requestedUserId) return;
        if (result) {
          readingHistory.value = { status: "ready", lastReading: result };
        } else if (userChanged) {
          // Fresh load / account switch with no history → Welcome.
          readingHistory.value = { status: "empty" };
        }
        // Same-user refetch that came back empty: keep the card already showing
        // rather than erasing a known-good position on a spurious empty result.
      })
      .catch((err) => {
        if (deps.userId.peek() !== requestedUserId) return;
        console.error(
          "[Debug] [today-screen] getUserLastReading failed for userId",
          userId,
          err
        );
        // Only surface Welcome when there was no prior card to keep — a fresh
        // load or account switch. On a same-user refetch, a transient error
        // must NOT flash a returning user back to Welcome. Gating on
        // `userChanged` (not "is state ready?") keeps the cross-account
        // guarantee: a failed account-switch fetch still clears the old card.
        if (userChanged) {
          readingHistory.value = { status: "empty" };
        }
      });
  });

  return { readingHistory, dispose };
}
