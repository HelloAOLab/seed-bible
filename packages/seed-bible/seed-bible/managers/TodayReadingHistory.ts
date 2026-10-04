import { signal, effect, type ReadonlySignal } from "@preact/signals";
import type { ReadingEvent } from "./ReadingHistoryManager";

/** An inclusive window of unix seconds. */
export type Timespan = { from: number; to: number };

/** The windows the community card can be filtered to. */
export type TimespanOptionId = "twoDays" | "week" | "month" | "all";

/** A timespan filter resolved against the clock: `all` covers the whole year. */
export type TimespanOption = {
  year: number;
  timespan: Timespan | undefined;
};

/** Who read what: book id -> chapter number -> the reader ids who read it. */
export interface FilteredReading {
  [bookId: string]: {
    [chapter: number]: string[];
  };
}

/** A concrete resume position: the last book/chapter a user was reading. */
export type LastReading = { bookId: string; chapter: number };

/** The result of a last-reading lookup — a position, or `undefined` if none. */
export type UserLastReading = LastReading | undefined;

/**
 * The Today screen's reading-history gate as a three-state status, replacing
 * the old `LastReading | undefined` that conflated "still loading" with "no
 * history". `loading` and `ready` both render the personalized layout
 * (`loading` shows placeholders); only `empty` renders the Welcome page.
 *
 * - `loading` — this account is known to have history, and the fetch that
 *   fills the resume card is still in flight.
 * - `empty`   — no userId, no history last visit, or the fetch confirmed none.
 *   Welcome is up immediately, so the personalized page never blinks in first.
 * - `ready`   — the fetch found a resume position.
 */
export type ReadingHistoryState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; lastReading: LastReading };

/**
 * Reads one reader's events out of the shared reading-history store. Taken as a
 * parameter rather than reaching for `OsManager` directly so the queries below
 * stay pure functions a test can drive with a plain array.
 */
export type FetchReadingEvents = (
  recordName: string,
  startTime: number,
  endTime: number
) => Promise<Iterable<ReadingEvent>>;

const DAY_SECONDS = 24 * 60 * 60;

/**
 * The four community-card filter windows, resolved against the clock at the
 * moment of the call. Deliberately a function and not a `computed`: callers
 * read it when the user picks a filter, and a cached value would pin the window
 * to whenever the screen first rendered.
 */
export function buildTimespanOptions(): Record<
  TimespanOptionId,
  TimespanOption
> {
  const now = new Date();
  const year = now.getFullYear();
  const nowSeconds = Math.floor(now.getTime() / 1000);

  return {
    twoDays: {
      year,
      timespan: { from: nowSeconds - 2 * DAY_SECONDS, to: nowSeconds },
    },
    week: {
      year,
      timespan: { from: nowSeconds - 7 * DAY_SECONDS, to: nowSeconds },
    },
    month: {
      year,
      timespan: { from: nowSeconds - 30 * DAY_SECONDS, to: nowSeconds },
    },
    all: { year, timespan: undefined },
  };
}

/** The latest position a reader reached inside `span`, if they read at all. */
export async function getUserLastReading(
  fetchEvents: FetchReadingEvents,
  userId: string,
  span: Timespan
): Promise<UserLastReading> {
  let latest: ReadingEvent | undefined = undefined;
  for (const event of await fetchEvents(userId, span.from, span.to)) {
    if (!latest || latest.end < event.end) {
      latest = event;
    }
  }

  if (!latest) return undefined;
  return { bookId: latest.bookId, chapter: latest.chapter };
}

/**
 * Which chapters each reader finished inside `span`.
 *
 * Readers are keyed by the record name the events were fetched under, not by
 * `event.userId` — the two are not provably the same value, and the card's
 * avatars are matched against the reader list the caller supplied.
 */
export async function getCommunityReading(
  fetchEvents: FetchReadingEvents,
  readerIds: readonly string[],
  span: Timespan
): Promise<FilteredReading> {
  const perReader = await Promise.all(
    readerIds.map((readerId) =>
      fetchEvents(readerId, span.from, span.to).then((events) => ({
        readerId,
        events,
      }))
    )
  );

  const filteredReading: FilteredReading = {};
  for (const { readerId, events } of perReader) {
    for (const { bookId, chapter, end } of events) {
      if (end < span.from || end > span.to) continue;

      const chapters = (filteredReading[bookId] ??= {});
      const readers = (chapters[chapter] ??= []);
      if (!readers.includes(readerId)) {
        readers.push(readerId);
      }
    }
  }

  return filteredReading;
}

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
    range: Timespan
  ) => Promise<UserLastReading>;
}

const ONE_YEAR_SECONDS = 365 * DAY_SECONDS;

/**
 * Per-account memory of the last history result. A returning reader starts on
 * the personalized layout (placeholders while this visit's fetch lands).
 * Everyone else starts on Welcome, so a signed-in user with nothing to resume
 * never sees the regular page blink in first. Remembered only after a real
 * result — a failed fetch must not teach the next visit the wrong screen.
 * Left in place on sign-out: one short entry per account that has signed in
 * here. Dropping it would make that account's next sign-in flash Welcome
 * until the history fetch returns.
 */
const HISTORY_KNOWN_KEY_PREFIX = "sb-today-history-";

type KnownHistory = "ready" | "empty";

function readKnownHistory(userId: string): KnownHistory | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const value = localStorage.getItem(HISTORY_KNOWN_KEY_PREFIX + userId);
    return value === "ready" || value === "empty" ? value : null;
  } catch {
    return null;
  }
}

function writeKnownHistory(userId: string, known: KnownHistory): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(HISTORY_KNOWN_KEY_PREFIX + userId, known);
  } catch {
    // Best-effort. The fetch result still drives this visit.
  }
}

/**
 * Owns the Today screen's reading-history gate. It derives the first-paint
 * branch from `userId` plus the last result stored for that account:
 *
 * - `userId === null` → `empty` (Welcome), no fetch.
 * - This account's last result was a resume position → `loading` (the
 *   personalized placeholders), then `ready` when the fetch lands. A
 *   returning reader never sees Welcome while that loads.
 * - Otherwise → `empty` (Welcome) immediately, including a signed-in user
 *   we have not seen before. The fetch still runs; a position promotes the
 *   screen to `ready` when it arrives.
 *
 * Cross-account safety: on every `userId` change the previous account's
 * position is dropped before the new fetch resolves, and any in-flight fetch
 * whose userId is no longer current is ignored — so account A's result can
 * never overwrite account B's state. A same-user refetch (reading progressed)
 * keeps the current card visible while revalidating.
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

    // Only reset when the account itself changed; a plain reading-progress
    // refetch keeps the current card visible (no flicker). A known reader
    // gets placeholders. Anyone else gets Welcome immediately — showing the
    // personalized page and then swapping it for Welcome is the blink.
    if (userChanged) {
      readingHistory.value =
        readKnownHistory(userId) === "ready"
          ? { status: "loading" }
          : { status: "empty" };
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
          writeKnownHistory(requestedUserId, "ready");
        } else if (userChanged) {
          // Fresh load / account switch with no history → Welcome.
          readingHistory.value = { status: "empty" };
          writeKnownHistory(requestedUserId, "empty");
        }
        // Same-user refetch that came back empty: keep the card already showing
        // rather than erasing a known-good position on a spurious empty result.
      })
      .catch((err) => {
        if (deps.userId.peek() !== requestedUserId) return;
        console.error(
          "[TodayManager] getUserLastReading failed for userId",
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
