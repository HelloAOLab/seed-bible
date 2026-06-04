import type { ReadingHistoryContextType } from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";
import type {
  RangedReadingEventsByBook,
  ReadingEventsByDay,
  DailyReadingHistorySummaries,
  ReadingHistoryUserFilters,
  DateRange,
  KeyRangesMap,
  TimelineRangesMap,
} from "scriptureMap.models.readingHistory";
import { useTimeContext } from "scriptureMap.contexts.Time.TimeContext";
import {
  getReadingHistoryEvents,
  flat,
  calculateReadingHistorySummary,
} from "seed-bible.managers.ReadingHistoryManager";
import type { ReadingHistorySummary } from "seed-bible.managers.ReadingHistoryManager";
import type { Range } from "scriptureMap.models.commonTypes";
import type { UsersDataMap } from "scriptureMap.models.user";
import { ScriptureMapModes } from "scriptureMap.models.scriptureMap";
import type { ConnectedUserData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/userPresence";
import { useTodayContext } from "../today/TodayContext";

const { useState, useMemo, useEffect, useCallback } = os.appHooks;

type UseReadingHistoryProvider = () => ReadingHistoryContextType;

const timelineMinYear = 2023;

const initialTimelineYear = new Date().getFullYear();

export const useReadingHistoryProvider: UseReadingHistoryProvider = () => {
  const { getDayRangeSeconds } = useTodayContext();

  const { tick } = useTimeContext();

  const timelineRangesMap = useMemo<TimelineRangesMap>(() => {
    const rangesMap = new Map<number, DateRange>();

    const nowDate = new Date();
    const endOfToday = new Date(nowDate);
    endOfToday.setHours(23, 59, 59, 999);

    for (let year = nowDate.getFullYear(); year > timelineMinYear; year--) {
      const startDate = new Date(nowDate);
      const endDate = new Date(nowDate);
      endDate.setFullYear(year);
      endDate.setHours(23, 59, 59, 999);

      startDate.setFullYear(year - 1);
      startDate.setHours(0, 0, 0, 0);
      if (startDate && endDate) {
        rangesMap.set(year, {
          startDate,
          endDate,
        });
      }
    }

    return rangesMap;
  }, []);

  const [selectedTimelineYear, setSelectedTimelineYear] =
    useState<number>(initialTimelineYear);
  const timelineRange = useMemo<DateRange>(() => {
    let range = timelineRangesMap.get(selectedTimelineYear);
    if (!range) {
      const now = new Date();
      range = {
        startDate: now,
        endDate: now,
      };
    }
    return range;
  }, [timelineRangesMap, selectedTimelineYear]);

  const [readingHistoryRangeSeconds, setReadingHistoryRangeSeconds] =
    useState<Range | null>(null);
  const [userFiltersMap, setReadingHistoryUserFilters] =
    useState<ReadingHistoryUserFilters>(new Map());
  const [yearlyReadingHistorySummary, setYearlyReadingHistorySummary] =
    useState<ReadingHistorySummary | null>(null);
  const [rangedReadingEventsByBook, setRangedReadingEventsByBook] =
    useState<RangedReadingEventsByBook>(new Map());
  const [dailyReadingHistorySummaries, setDailyReadingHistorySummaries] =
    useState<DailyReadingHistorySummaries | null>(null);
  const [selectedUsersCount, setSelectedUsersCount] = useState<number>(0);
  const [readingEventsByDay, setReadingEventsByDay] =
    useState<ReadingEventsByDay | null>(null);

  const {
    startDateStartOfWeek,
    endDateStartOfWeek,
    weeksCount,
    SEC_PER_MINUTE,
    SEC_PER_HOUR,
    SEC_PER_DAY,
    SEC_PER_WEEK,
    MS_PER_SECOND,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
    MS_PER_WEEK,
    dayRangesMap,
  } = useMemo(() => {
    const getStartOfWeek = (date: Date) => {
      const tempDate = new Date(date);
      tempDate.setDate(tempDate.getDate() - tempDate.getDay());
      tempDate.setHours(0, 0, 0, 0);
      return tempDate;
    };

    const startDateStartOfWeek = getStartOfWeek(timelineRange.startDate);
    const endDateStartOfWeek = getStartOfWeek(timelineRange.endDate);

    const SEC_PER_MINUTE = 60;
    const SEC_PER_HOUR = SEC_PER_MINUTE * 60;
    const SEC_PER_DAY = SEC_PER_HOUR * 24;
    const SEC_PER_WEEK = SEC_PER_DAY * 7;

    const MS_PER_SECOND = 1000;
    const MS_PER_MINUTE = MS_PER_SECOND * SEC_PER_MINUTE;
    const MS_PER_HOUR = MS_PER_SECOND * SEC_PER_HOUR;
    const MS_PER_DAY = MS_PER_SECOND * SEC_PER_DAY;
    const MS_PER_WEEK = MS_PER_SECOND * SEC_PER_WEEK;

    const weeksCount =
      Math.floor(
        (endDateStartOfWeek.getTime() - startDateStartOfWeek.getTime()) /
          MS_PER_WEEK
      ) + 1;

    const dayRangesMap: KeyRangesMap = new Map();
    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > timelineRange.endDate.getDay())
          break;
        const dayDate = new Date(startDateStartOfWeek);
        dayDate.setDate(dayDate.getDate() + week * 7 + day);
        const { start, end } = getDayRangeSeconds(dayDate.getTime());
        dayRangesMap.set(`${week}-${day}`, { start, end });
      }
    }

    return {
      startDateStartOfWeek,
      endDateStartOfWeek,
      weeksCount,
      MS_PER_SECOND,
      MS_PER_MINUTE,
      MS_PER_HOUR,
      MS_PER_DAY,
      MS_PER_WEEK,
      SEC_PER_MINUTE,
      SEC_PER_HOUR,
      SEC_PER_DAY,
      SEC_PER_WEEK,
      dayRangesMap,
    };
  }, [timelineRange]);

  useEffect(() => {
    let isMounted = true;
    const selectedUsers = [];

    for (const [userId, selected] of userFiltersMap) {
      if (selected) {
        selectedUsers.push(userId);
      }
    }

    setSelectedUsersCount(selectedUsers.length);

    let summary;
    const rangedEventsByBook: RangedReadingEventsByBook = new Map();
    const eventsByDay: ReadingEventsByDay = new Map();
    const dailySummaries: DailyReadingHistorySummaries = new Map();

    if (selectedUsers.length === 0) {
      summary = calculateReadingHistorySummary([]);
      setYearlyReadingHistorySummary(summary);
      setRangedReadingEventsByBook(rangedEventsByBook);
      setReadingEventsByDay(eventsByDay);
      setDailyReadingHistorySummaries(dailySummaries);
      return;
    }

    const startDateStartOfWeekSeconds = startDateStartOfWeek.getTime() / 1000;
    const endSeconds = timelineRange.endDate.getTime() / 1000;

    const allEventPromises = selectedUsers.map((recordName) =>
      getReadingHistoryEvents(
        recordName,
        startDateStartOfWeekSeconds,
        endSeconds
      )
    );

    const dayKeys = Array.from(dayRangesMap.keys());
    const {
      start: rangeStart = startDateStartOfWeekSeconds,
      end: rangeEnd = endSeconds,
    } = readingHistoryRangeSeconds ?? {};

    const yieldToMain = () =>
      new Promise<void>((resolve) => setTimeout(resolve, 0));

    Promise.all(allEventPromises)
      .then(async (allEvents) => {
        if (!isMounted) return;
        const flattenedEvents = Array.from(flat(allEvents));

        for (const event of flattenedEvents) {
          const { start, end, /*chapter,*/ bookId } = event;
          const duration = end - start;
          if (duration < SEC_PER_MINUTE) continue;
          if (start >= rangeStart && start <= rangeEnd) {
            // if (bookId === "PSA") {
            //   const { bookId: dividedPsalmId, chapter: dividedPsalmChapter } =
            //     scriptureService.convertCompletePsalmsToDivided({
            //       chapter,
            //     });
            //   event = {
            //     ...event,
            //     bookId: dividedPsalmId,
            //     chapter: dividedPsalmChapter,
            //   };
            //   bookId = dividedPsalmId;
            // }
            if (!rangedEventsByBook.has(bookId)) {
              rangedEventsByBook.set(bookId, []);
            }
            rangedEventsByBook.get(bookId)?.push(event);
          }

          const dayIndex = Math.floor(
            (start - startDateStartOfWeekSeconds) / SEC_PER_DAY
          );

          if (dayIndex >= 0 && dayIndex < dayKeys.length) {
            const key = dayKeys[dayIndex];

            if (key) {
              if (!eventsByDay.has(key)) {
                eventsByDay.set(key, []);
              }
              eventsByDay.get(key)?.push(event);
            }
          }
        }

        let iterations = 0;
        for (const [dayKey, events] of eventsByDay) {
          const daySummary = calculateReadingHistorySummary(events);
          dailySummaries.set(dayKey, daySummary);
          iterations++;
          if (iterations % 30 === 0) {
            await yieldToMain();
          }
        }

        await yieldToMain();

        summary = calculateReadingHistorySummary(flattenedEvents);

        if (!isMounted) return;

        setYearlyReadingHistorySummary(summary);
        setRangedReadingEventsByBook(rangedEventsByBook);
        setReadingEventsByDay(eventsByDay);
        setDailyReadingHistorySummaries(dailySummaries);
      })
      .catch((error) => {
        console.warn(
          `[Debug] ReadingHistoryContext error fetching reading events`,
          error
        );
      });
    return () => {
      isMounted = false;
    };
  }, [
    tick,
    selectedTabId,
    userFiltersMap,
    readingHistoryRangeSeconds,
    timelineRange,
    startDateStartOfWeek,
  ]);

  const handleReadingHistoryUserSelectorClick = useCallback<
    (key: string) => void
  >(
    (key) => {
      const copy = new Map(userFiltersMap);
      if (key === "all") {
        for (const [stateKey] of userFiltersMap) {
          copy.set(stateKey, true);
        }
      } else {
        const allSelected = Array.from(userFiltersMap).every(([, value]) => {
          return value;
        });
        if (allSelected && copy.size > 1) {
          for (const [stateKey] of userFiltersMap) {
            copy.set(stateKey, stateKey === key);
          }
        } else {
          copy.set(key, !copy.get(key));
        }
      }
      // console.log(
      //   `[Debug] useReadingHistoryProvider calling setReadingHistoryUserFilters from handleReadingHistoryUserSelectorClick`
      // );

      setReadingHistoryUserFilters(copy);
    },
    [userFiltersMap, setReadingHistoryUserFilters]
  );

  const handleReadingHistoryRangeSelectorClick = useCallback<
    (range: Range | null) => void
  >(
    (range) => {
      setReadingHistoryRangeSeconds(range);
    },
    [setReadingHistoryRangeSeconds]
  );

  const shouldShowReadingHistory = useMemo<boolean>(() => {
    return (
      mode === ScriptureMapModes.Viewer &&
      isReadingHistoryEnabled &&
      usersDataMap.size > 0
    );
  }, [mode, isReadingHistoryEnabled, usersDataMap, ScriptureMapModes]);

  useEffect(() => {
    if (shouldShowReadingHistory) {
      setShowingBooksColors(false);
    }
  }, [shouldShowReadingHistory]);

  return {
    myUserId,
    yearlyReadingHistorySummary,
    rangedReadingEventsByBook,
    readingEventsByDay,
    dailyReadingHistorySummaries,
    userFiltersMap,
    handleReadingHistoryUserSelectorClick,
    readingHistoryRangeSeconds,
    handleReadingHistoryRangeSelectorClick,
    weeksCount,
    SEC_PER_MINUTE,
    SEC_PER_HOUR,
    SEC_PER_DAY,
    SEC_PER_WEEK,
    MS_PER_SECOND,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
    MS_PER_WEEK,
    dayRangesMap,
    selectedUsersCount,
    usersDataMap,
    shouldShowReadingHistory,
    timelineRange,
    timelineRangesMap,
    startDateStartOfWeek,
    endDateStartOfWeek,
    selectedTimelineYear,
    setSelectedTimelineYear,
    timelineRangeMethod,
    setTimelineRangeMethod,
  };
};
