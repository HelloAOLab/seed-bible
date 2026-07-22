import type {
  ReadingEvent,
  ReadingHistorySummary,
} from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { Range } from "./commonTypes";
import type { Timespan } from "./commonTypes";

export const COMMUNITY_READING_SPAN_IDS = {
  twoDays: "twoDays",
  week: "week",
  month: "month",
} as const;
export type CommunityReadingSpanId =
  (typeof COMMUNITY_READING_SPAN_IDS)[keyof typeof COMMUNITY_READING_SPAN_IDS];

export type TimespanOptionId = CommunityReadingSpanId | "all";

export type TimespanOption = {
  year: number;
  timespan: Timespan | undefined;
};

/** Data for a single timespan-filter button in the history card. */
export interface TimespanFilterOptionData {
  label: string;
  id: TimespanOptionId;
  onClick: () => void;
  isSelected: boolean;
}

export interface FilteredReading {
  [bookId: string]: {
    [chapter: number]: string[];
  };
}

/** Reading events grouped by a day key (e.g. `"week-day"`). */
export type ReadingEventsByDay = Map<string, ReadingEvent[]>;

/** Per-day reading-history summaries, keyed by the same day key. */
export type DailyReadingHistorySummaries = Map<string, ReadingHistorySummary>;

/** An inclusive date window. */
export type DateRange = {
  startDate: Date;
  endDate: Date;
};

/** Maps a day key to its second-based time range. */
export type KeyRangesMap = Map<string, Range>;

/** Maps a timeline year to the date window it covers. */
export type TimelineRangesMap = Map<number, DateRange>;

export type CommunityReading<T extends string> = {
  [K in T]: FilteredReading;
};

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
 * - `loading` — a userId is known and the history fetch is in flight.
 * - `empty`   — no userId (new/anonymous), or the fetch confirmed no history.
 * - `ready`   — the fetch found a resume position.
 */
export type ReadingHistoryState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; lastReading: LastReading };
