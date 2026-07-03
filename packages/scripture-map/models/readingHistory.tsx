import type {
  ReadingEvent,
  ReadingHistorySummary,
} from "../../seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { Range } from "./commonTypes";

export type RangedReadingEventsByBook = Map<string, ReadingEvent[]>;

export type ReadingEventsByDay = Map<string, ReadingEvent[]>;

export type DailyReadingHistorySummaries = Map<string, ReadingHistorySummary>;

export type ReadingHistoryUserFilters = Map<string, boolean>;

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type KeyRangesMap = Map<string, Range>;

export type TimelineRangesMap = Map<number, DateRange>;

export const TimelineRangeMethod = {
  Rolling: "Rolling",
  Calendar: "Calendar",
} as const;

export type TimelineRangeMethodType =
  (typeof TimelineRangeMethod)[keyof typeof TimelineRangeMethod];
