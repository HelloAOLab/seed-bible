import { type ProjectChapterStateType } from "scriptureMap2D.main.enums";
import type {
  ReadingEvent,
  ReadingHistorySummary,
} from "db.annotations.library";

export type ChapterKey = {
  testamentName: string;
  sectionName: string;
  bookName: string;
  chapterIndex: number;
};

export type BookKey = {
  testamentName: string;
  sectionName: string;
  bookName: string;
};

export type ProjectStateStyle = Record<
  ProjectChapterStateType,
  React.CSSProperties
>;

export type ProjectFilters = Map<ProjectChapterStateType, boolean>;

export type RangedReadingEventsByBook = Map<string, ReadingEvent[]>;

export type ReadingEventsByDay = Map<string, ReadingEvent[]>;

export type DailyReadingHistorySummaries = Map<string, ReadingHistorySummary>;

export type ReadingHistoryUserFilters = Map<string, boolean>;

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type Range = {
  start: number;
  end: number;
};

export type KeyRangesMap = Map<string, Range>;

export type UserData = {
  profileName?: string;
  photoLink?: string;
  id: string;
};

export type UsersDataMap = Map<string, UserData>;

export type TimelineRangesMap = Map<number, DateRange>;

export type TooltipAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type BookUserPresenceItem = {
  chapter: number;
  borderColor: string;
};

export type BookUserPresence = Record<string, BookUserPresenceItem>;

export type ScriptureMap2DContentValue = {
  books: {
    [book: string]: {
      [chapter: string]: boolean[];
    };
  };
};
