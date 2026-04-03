import { useReadingHistoryProvider } from "scriptureMap2D.contexts.ReadingHistory.useReadingHistoryProvider";
import type {
  RangedReadingEventsByBook,
  ReadingEventsByDay,
  DailyReadingHistorySummaries,
  ReadingHistoryUserFilters,
  DateRange,
  KeyRangesMap,
  TimelineRangesMap,
  TimelineRangeMethodType,
} from "scriptureMap2D.models.readingHistory";
import type { ReadingHistorySummary } from "db.annotations.library";
import type { StateUpdater } from "../../../../../typings/AuxLibraryDefinitions";
import type { Range } from "scriptureMap2D.models.commonTypes";
import type { UsersDataMap } from "scriptureMap2D.models.user";

const { createContext, useContext } = os.appHooks;

export interface ReadingHistoryProviderProps {
  children: React.ReactNode;
}

export interface ReadingHistoryContextType {
  myAuthBotId: string | null;
  yearlyReadingHistorySummary: ReadingHistorySummary | null;
  rangedReadingEventsByBook: RangedReadingEventsByBook;
  readingEventsByDay: ReadingEventsByDay | null;
  dailyReadingHistorySummaries: DailyReadingHistorySummaries | null;
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
  shouldShowReadingHistory: boolean;
  timelineRange: DateRange;
  timelineRangesMap: TimelineRangesMap;
  startDateStartOfWeek: Date;
  endDateStartOfWeek: Date;
  selectedTimelineKey: number;
  setSelectedTimelineKey: StateUpdater<number>;
  timelineRangeMethod: TimelineRangeMethodType;
  setTimelineRangeMethod: StateUpdater<TimelineRangeMethodType>;
}

const ReadingHistoryContext = createContext<
  ReadingHistoryContextType | undefined
>(undefined);

export const ReadingHistoryProvider = ({
  children,
}: ReadingHistoryProviderProps) => {
  const contextValue = useReadingHistoryProvider();

  return (
    <ReadingHistoryContext.Provider value={contextValue}>
      {children}
    </ReadingHistoryContext.Provider>
  );
};

export const useReadingHistoryContext = () => {
  const context = useContext(ReadingHistoryContext);

  if (!context) {
    throw new Error(
      "useReadingHistoryContext must be used within a ReadingHistoryContext"
    );
  }

  return context;
};
