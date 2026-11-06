import { signal, type ReadonlySignal } from "@preact/signals";
import type { CommunityFeedItem } from "./TodayCommunityFeed";
import { startOfLocalDay } from "./TodayCommunityFeed";
import type { Timespan } from "./TodayReadingHistory";

/** How many more rows each "See more" adds. */
export const FEED_PAGE_SIZE = 8;

const DAY_SECONDS = 24 * 60 * 60;

export type GetCommunityFeed = (
  span: Timespan,
  options: { crossedPaths: boolean }
) => Promise<CommunityFeedItem[]>;

export interface CommunityFeedPager {
  /**
   * The recent rows, shown without asking: everything since local midnight
   * two days back, so they always cover at least the last 48 hours and never
   * cut a day in half (a reader's day is one row; splitting it at an exact
   * hour would give that day two rows).
   */
  recent: ReadonlySignal<CommunityFeedItem[]>;
  /** Older rows loaded so far, newest first. */
  older: ReadonlySignal<CommunityFeedItem[]>;
  /** True until the recent rows have arrived. */
  loadingRecent: ReadonlySignal<boolean>;
  /** True while older rows are being fetched. */
  loadingOlder: ReadonlySignal<boolean>;
  /**
   * False once a whole year comes back without any activity, which is taken
   * as the start of the community's history.
   */
  mayHaveOlder: ReadonlySignal<boolean>;
  /**
   * Fetches older years until at least `count` older rows pass `accept`, or
   * the history runs out. Calls queue rather than overlap.
   */
  loadOlder: (
    count: number,
    accept: (item: CommunityFeedItem) => boolean
  ) => Promise<void>;
  /** Drops results still in flight, for a pager that has been replaced. */
  dispose: () => void;
}

/** The local midnight one calendar year before `seconds` (itself a midnight). */
function yearBefore(seconds: number): number {
  const date = new Date(seconds * 1000);
  date.setFullYear(date.getFullYear() - 1);
  return startOfLocalDay(Math.floor(date.getTime() / 1000));
}

/**
 * The community feed as the Today screen shows it by default: the recent rows
 * up front, then older activity a year at a time as the reader asks for more.
 * Crossed paths are grouped only in the recent rows, where "you both read
 * this" means you read it around the same time; in older years it would pair
 * readings months apart.
 */
export function createCommunityFeedPager(
  getCommunityFeed: GetCommunityFeed,
  now: Date = new Date()
): CommunityFeedPager {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const recentFrom = startOfLocalDay(nowSeconds - 2 * DAY_SECONDS);

  const recent = signal<CommunityFeedItem[]>([]);
  const older = signal<CommunityFeedItem[]>([]);
  const loadingRecent = signal(true);
  const loadingOlder = signal(false);
  const mayHaveOlder = signal(true);
  let disposed = false;
  // Everything before this instant is still unfetched.
  let olderBoundary = recentFrom;
  let queue: Promise<void> = Promise.resolve();

  getCommunityFeed({ from: recentFrom, to: nowSeconds }, { crossedPaths: true })
    .then((items) => {
      if (!disposed) recent.value = items;
    })
    .catch((error: unknown) => {
      console.error(
        "[CommunityFeedPager] Could not load recent activity",
        error
      );
    })
    .finally(() => {
      if (!disposed) loadingRecent.value = false;
    });

  const fetchOlderYear = async (): Promise<boolean> => {
    const from = yearBefore(olderBoundary);
    const items = await getCommunityFeed(
      { from, to: olderBoundary - 1 },
      { crossedPaths: false }
    );
    if (disposed) return false;
    olderBoundary = from;
    if (items.length === 0) {
      mayHaveOlder.value = false;
      return false;
    }
    older.value = [...older.value, ...items];
    return true;
  };

  const loadOlder: CommunityFeedPager["loadOlder"] = (count, accept) => {
    queue = queue.then(async () => {
      if (disposed) return;
      loadingOlder.value = true;
      try {
        while (
          !disposed &&
          mayHaveOlder.value &&
          older.value.filter(accept).length < count
        ) {
          if (!(await fetchOlderYear())) break;
        }
      } catch (error: unknown) {
        // Left retryable: the next "See more" asks for the same year again.
        console.error(
          "[CommunityFeedPager] Could not load older activity",
          error
        );
      } finally {
        if (!disposed) loadingOlder.value = false;
      }
    });
    return queue;
  };

  // The first older year is fetched up front, so "See more" only shows when
  // there is something to see and its first click answers at once.
  void loadOlder(1, () => true);

  return {
    recent,
    older,
    loadingRecent,
    loadingOlder,
    mayHaveOlder,
    loadOlder,
    dispose: () => {
      disposed = true;
    },
  };
}
