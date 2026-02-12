import type {
  ScriptureMap2DModesType,
  ProjectChapterStateType,
  TimelineRangeMethodType,
} from "scriptureMap2D.main.enums";
import type {
  BookKey,
  ChapterKey,
  ProjectStateStyle,
  ProjectFilters,
  RangedReadingEventsByBook,
  ReadingEventsByDay,
  DailyReadingHistorySummaries,
  ReadingHistoryUserFilters,
  Range,
  DateRange,
  KeyRangesMap,
  UsersDataMap,
  TimelineRangesMap,
  BookUserPresence,
  ScriptureMap2DContentValue,
} from "scriptureMap2D.main.types";
import type {
  ArrangementInfo,
  TestamentInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import type {
  ReadingHistorySummary,
  ReadingEvent,
} from "db.annotations.library";

export interface AppProps {
  id: string;
}

export interface ScriptureMap2DConfig {
  arrangementIndex?: number;
  mode: ScriptureMap2DModesType;
  onChapterClick: (
    event: PointerEvent,
    key: ChapterKey,
    checked: boolean
  ) => void;
  onChapterClickDependencies: unknown[];
  onChapterClickAndHold: () => void;
  onBookNameClickAndHold: (
    showChapters: boolean,
    key: BookKey,
    checked: boolean | undefined
  ) => void;
  onBookNameClickAndHoldDependencies: unknown[];
  initialShowingAllChapters?: boolean;
  initialShowTestamentLabels?: boolean;
  initialShowSectionLabels?: boolean;
  initialScaleFactor?: number;
  initialIsReadingHistoryEnabled?: boolean;
  appId: string;
  isInSelectionMode?: boolean;
  selection?: {
    [testament: string]: {
      [section: string]: {
        [book: string]: boolean[];
      };
    };
  };
  project?: {
    name: string;
    structure: {
      [testament: string]: {
        [section: string]: {
          [book: string]: ProjectChapterStateType[];
        };
      };
    };
  };
}

export interface ScriptureMap2DProviderProps {
  children: React.ReactNode;
  config: ScriptureMap2DConfig;
}

export interface ScriptureMap2DContextType extends ScriptureMap2DConfig {
  scaleFactor: number;
  MIN_SCALE_FACTOR: number;
  setScaleFactor: (value: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  showTestamentLabels: boolean;
  showSectionLabels: boolean;
  handleTestamentLabelsToggle: () => void;
  handleSectionLabelsToggle: () => void;
  handleShowAllChaptersToggle: () => void;
  arrangementIndex: number;
  arrangement: ArrangementInfo;
  showingAllChapters: boolean;
  setShowingAllChapters: (value: boolean) => void;
  isUserPresenceEnabled: boolean;
  setIsUserPresenceEnabled: (value: boolean) => void;
  isReadingHistoryEnabled: boolean;
  setIsReadingHistoryEnabled: (value: boolean) => void;
  content: Map<string, ScriptureMap2DContentValue>;
  MAX_CHAPTER_HEAT_COUNT: number;
  usersInfo: {
    [user: string]: {
      color?: string;
      borderColor: string;
    };
  };
  userPresence: {
    [user: string]: {
      bookId: string;
      chapter: number;
    };
  };
  bookWidth: number;
  chapterGap: number;
  chapterWidth: number;
  chapterHeight: number;
  handleProjectFilterOptionClick: (
    key: "all" | ProjectChapterStateType
  ) => void;
  upcomingEvents: {
    [user: string]: {
      book: string;
      chapter: number;
      remainingDays: number;
    }[];
  };
  projectFilters: ProjectFilters;
  projectStateStyle: ProjectStateStyle;
  BASE_BACKGROUND_COLOR: React.CSSProperties["color"];
  isMobile: boolean;
  showingBooksColors: boolean;
  setShowingBooksColors: (value: boolean) => void;
  activeTabId: string;

  tabs: any;
  activeTab: any;
}

export interface TestamentContextType {
  testament: TestamentInfo;
  testamentIndex: number;
}

export interface TimeProviderProps {
  children: React.ReactNode;
}

export interface TimeContextType {
  tick: number;
}

export interface ReadingHistoryProviderProps {
  children: React.ReactNode;
}

export interface ReadingHistoryContextType {
  myAuthBotId: string | null;
  yearlyReadingHistorySummary: ReadingHistorySummary | null;
  rangedReadingEventsByBook: RangedReadingEventsByBook;
  readingEventsByDay: ReadingEventsByDay;
  dailyReadingHistorySummaries: DailyReadingHistorySummaries;
  readingHistoryUserFilters: ReadingHistoryUserFilters;
  handleReadingHistoryUserSelectorClick: (key: string) => void;
  readingHistoryRangeSeconds: Range | null;
  handleReadingHistoryRangeSelectorClick: (range: Range | null) => void;
  weeksCount: number;
  SEC_PER_MINUTE: number;
  SEC_PER_HOUR: number;
  SEC_PER_DAY: number;
  SEC_PER_WEEK: number;
  MS_PER_SECOND: number;
  MS_PER_MINUTE: number;
  MS_PER_HOUR: number;
  MS_PER_DAY: number;
  MS_PER_WEEK: number;
  dayRangesMap: KeyRangesMap;
  selectedUsersCount: number;
  usersDataMap: UsersDataMap;
  shouldShowReadingHistory: number;
  timelineRange: DateRange;
  timelineRangesMap: TimelineRangesMap;
  startDateStartOfWeek: Date;
  endDateStartOfWeek: Date;
  selectedTimelineKey: number;
  setSelectedTimelineKey: (key: number) => void;
  timelineRangeMethod: TimelineRangeMethodType;
  setTimelineRangeMethod: (value: TimelineRangeMethodType) => void;
}

export interface BookProps {
  book: string;
  bookId: string;
  bookCoverBackgroundColor: string;
  sectionName: string;
  readingEvents: ReadingEvent[];
  readingSummary: ReadingHistorySummary;
  isPsalms: boolean;
  bookBorderGradientColors: string | undefined;
  bookUserPresence: BookUserPresence;
  bookUserPresenceColors: string[];
}
