import type {
  ReadingEvent,
  ReadingHistorySummary,
} from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { Range } from "./commonTypes";

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

export const COMMUNITY_READING_SPAN_IDS = {
  twoDays: "twoDays",
  week: "week",
  month: "month",
} as const;
export type CommunityReadingSpanId =
  (typeof COMMUNITY_READING_SPAN_IDS)[keyof typeof COMMUNITY_READING_SPAN_IDS];

export type UserLastReading = { bookId: string; chapter: number } | undefined;
