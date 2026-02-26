import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import {
  getReadingHistoryEvents,
  flat,
  calculateReadingHistorySummary,
  getSubscribedUsers,
} from "db.annotations.library";
import type { ReadingHistorySummary } from "db.annotations.library";
import { useTabsContext } from "app.hooks.tabs";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import type {
  ReadingHistoryContextType,
  ReadingHistoryProviderProps,
} from "scriptureMap2D.main.interfaces";
import type {
  RangedReadingEventsByBook,
  ReadingEventsByDay,
  DailyReadingHistorySummaries,
  DateRange,
  Range,
  UserData,
  ReadingHistoryUserFilters,
  KeyRangesMap,
  UsersDataMap,
  TimelineRangesMap,
} from "scriptureMap2D.main.types";
import {
  ScriptureMap2DModes,
  TimelineRangeMethod,
  type TimelineRangeMethodType,
} from "scriptureMap2D.main.enums";
import { scriptureService } from "bibleVizUtils.services.index";
import { GetDayRangeSeconds } from "bibleVizUtils.functions.index";
import { eventSystem, Events } from "scriptureMap2D.main.eventManager";

const { createContext, useContext, useState, useMemo, useEffect, useCallback } =
  os.appHooks;

const ReadingHistoryContext = createContext<
  ReadingHistoryContextType | undefined
>(undefined);

const timelineMinYear = 2023;

const initialTimelineRangeKey = new Date().getFullYear();

export const ReadingHistoryProvider: (
  args: ReadingHistoryProviderProps
) => React.JSX.Element = ({ children }) => {
  const { mode, isReadingHistoryEnabled, setShowingBooksColors } =
    useScriptureMap2DContext();

  const { activeTab } = useTabsContext();
  const { tick } = useTimeContext();

  const [timelineRangeMethod, setTimelineRangeMethod] =
    useState<TimelineRangeMethodType>(TimelineRangeMethod.Rolling);

  const timelineRangesMap = useMemo<TimelineRangesMap>(() => {
    const rangesMap = new Map<number, DateRange>();

    const nowDate = new Date();
    const endOfToday = new Date(nowDate);
    endOfToday.setHours(23, 59, 59, 999);

    for (let year = nowDate.getFullYear(); year > timelineMinYear; year--) {
      let startDate: Date;
      let endDate: Date;
      switch (timelineRangeMethod) {
        case TimelineRangeMethod.Rolling:
          {
            endDate = new Date(nowDate);
            endDate.setFullYear(year);
            endDate.setHours(23, 59, 59, 999);

            startDate = new Date(nowDate);
            startDate.setFullYear(year - 1);
            startDate.setHours(0, 0, 0, 0);
          }
          break;
        case TimelineRangeMethod.Calendar:
          {
            startDate = new Date(year, 0, 1, 0, 0, 0); // Jan 1st (00:00:00)
            endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31st (23:59:59)
            // if (endDate.getTime() > endOfToday.getTime()) {
            //   endDate = new Date(endOfToday);
            // }
          }
          break;
      }
      if (startDate && endDate) {
        rangesMap.set(year, {
          startDate,
          endDate,
        });
      }
    }

    return rangesMap;
  }, [timelineRangeMethod]);

  const [selectedTimelineKey, setSelectedTimelineKey] = useState<number>(
    initialTimelineRangeKey
  );
  const timelineRange = useMemo<DateRange>(() => {
    let range = timelineRangesMap.get(selectedTimelineKey);
    if (!range) {
      const now = new Date();
      // const endOfToday = new Date(now);
      // endOfToday.setHours(23, 59, 59, 999);
      // const startOfAYearAgo = new Date(now);
      // startOfAYearAgo.setFullYear(now.getFullYear() - 1);
      // startOfAYearAgo.setHours(0, 0, 0, 0);
      // const startTimeSeconds = startOfAYearAgo.getTime() / 1000;
      // const endTimeSeconds = endOfToday.getTime() / 1000;
      range = {
        startDate: now,
        endDate: now,
      };
    }
    return range;
  }, [timelineRangesMap, selectedTimelineKey]);

  const [readingHistoryRangeSeconds, setReadingHistoryRangeSeconds] =
    useState<Range | null>(null);
  const [readingHistoryUserFilters, setReadingHistoryUserFilters] =
    useState<ReadingHistoryUserFilters>(new Map());
  const [myAuthBotId, setMyAuthBotId] = useState<string | null>(null);
  const [usersDataMap, setUsersDataMap] = useState<UsersDataMap>(new Map());
  const [yearlyReadingHistorySummary, setYearlyReadingHistorySummary] =
    useState<ReadingHistorySummary | null>(null);
  const [rangedReadingEventsByBook, setRangedReadingEventsByBook] =
    useState<RangedReadingEventsByBook>(new Map());
  const [dailyReadingHistorySummaries, setDailyReadingHistorySummaries] =
    useState<DailyReadingHistorySummaries | null>(null);
  const [selectedUsersCount, setSelectedUsersCount] = useState<number>(0);
  const [readingEventsByDay, setReadingEventsByDay] =
    useState<ReadingEventsByDay | null>(null);

  const handleUserLoggedIn = useCallback(() => {
    if (!myAuthBotId) {
      setMyAuthBotId(authBot.id);
      setReadingHistoryUserFilters((prevFilters) => {
        const filtersCopy = new Map(prevFilters);
        filtersCopy.set(authBot.id, true);
        return filtersCopy;
      });
    }
  }, [myAuthBotId]);

  const trySetMyAuthBotId = useCallback(() => {
    if (authBot) {
      handleUserLoggedIn();
    }
  }, [readingHistoryUserFilters, myAuthBotId]);

  const fetchUsersDataMap = useCallback(async () => {
    if (!myAuthBotId) return null;

    try {
      const componentsBot = getBot(byTag("system", "app.components"));
      const subscribedUsers = await getSubscribedUsers();

      if (!subscribedUsers) return null;

      const allAuthBotIds = [
        myAuthBotId,
        ...subscribedUsers.map((user) => user.id),
      ];

      const dataPromises: Promise<UserData>[] = allAuthBotIds.map(
        async (id) => {
          const firstResult = await os.getData(id, id);
          if (firstResult.success) return { ...firstResult.data, id };

          const secondResult = await os.getData(componentsBot.tags.key, id);
          if (secondResult.success) return { ...secondResult.data, id };

          return undefined;
        }
      );

      let rawUsersData = await Promise.all(dataPromises);
      rawUsersData = rawUsersData.filter(Boolean);

      const newUsersData: Map<string, UserData> = new Map(
        rawUsersData.map((data) => {
          return [data.id, data];
        })
      );

      return newUsersData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }, [myAuthBotId]);

  const refreshUsersDataMap = useCallback(async () => {
    const dataMap = await fetchUsersDataMap();

    if (dataMap) {
      setUsersDataMap(dataMap);
    }
  }, [fetchUsersDataMap]);

  useEffect(() => {
    const unsubscribeUserLoggedIn = eventSystem.subscribe(
      Events.UserLoggedIn,
      handleUserLoggedIn
    );
    const unsubscribeSubscriptionsChanged = eventSystem.subscribe(
      Events.SubscriptionsChanged,
      refreshUsersDataMap
    );

    trySetMyAuthBotId();

    return () => {
      unsubscribeUserLoggedIn();
      unsubscribeSubscriptionsChanged();
    };
  }, [handleUserLoggedIn, trySetMyAuthBotId]);

  useEffect(() => {
    let isMounted = true;

    const initUsersDataMap = async () => {
      const dataMap = await fetchUsersDataMap();

      if (isMounted && dataMap) {
        setUsersDataMap(dataMap);
      }
    };

    initUsersDataMap();

    return () => {
      isMounted = false;
    };
  }, [fetchUsersDataMap]);

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
        const { start, end } = GetDayRangeSeconds(dayDate.getTime());
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

  const tryUpdateReadingHistoryUsersFilters = useCallback(() => {
    const next = new Map(readingHistoryUserFilters);

    let changed = false;
    const usersAuthIds = Array.from(usersDataMap.keys());

    usersAuthIds.forEach((userId) => {
      if (!next.has(userId)) {
        next.set(userId, false);
        changed = true;
      }
    });

    Array.from(next.keys()).forEach((key) => {
      if (!usersAuthIds.some((userId) => userId === key)) {
        next.delete(key);
        changed = true;
      }
    });

    if (changed) {
      setReadingHistoryUserFilters(next);
    }
  }, [readingHistoryUserFilters, usersDataMap]);

  useEffect(() => {
    tryUpdateReadingHistoryUsersFilters();

    // const requestPersmissions = async () => {
    //   const authIds = Array.from(usersDataMap.keys());
    //   for(const authId of authIds)
    //   {
    //     const result = await os.grantInstAdminPermission(authId);
    //     console.log(`[Debug] ReadingHistoryContext useEffect for usersDataMap`, {result, authId, usersDataMap});
    //   }
    // }

    // requestPersmissions();
  }, [usersDataMap]);

  useEffect(() => {
    const selectedUsers = [];

    for (const [userId, selected] of readingHistoryUserFilters) {
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

    Promise.all(allEventPromises)
      .then((allEvents) => {
        const flattenedEvents = Array.from(flat(allEvents));

        for (let event of flattenedEvents) {
          let { start, end, chapter, bookId } = event;
          const duration = end - start;
          if (duration < SEC_PER_MINUTE) continue;
          if (start >= rangeStart && start <= rangeEnd) {
            if (bookId === "PSA") {
              const { bookId: dividedPsalmId, chapter: dividedPsalmChapter } =
                scriptureService.convertCompletePsalmsToDivided({
                  chapter,
                });
              event = {
                ...event,
                bookId: dividedPsalmId,
                chapter: dividedPsalmChapter,
              };
              bookId = dividedPsalmId;
            }
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

        for (const [dayKey, events] of eventsByDay) {
          const daySummary = calculateReadingHistorySummary(events);
          dailySummaries.set(dayKey, daySummary);
        }

        summary = calculateReadingHistorySummary(flattenedEvents);

        setYearlyReadingHistorySummary(summary);
        setRangedReadingEventsByBook(rangedEventsByBook);
        setReadingEventsByDay(eventsByDay);
        setDailyReadingHistorySummaries(dailySummaries);
      })
      .catch((error) => {
        console.warn(
          `[Debug] ReasdingHistoryContext error fetching reading events`,
          error
        );
      });
  }, [
    tick,
    activeTab,
    readingHistoryUserFilters,
    readingHistoryRangeSeconds,
    timelineRange,
    startDateStartOfWeek,
  ]);

  const handleReadingHistoryUserSelectorClick = useCallback<
    (key: string) => void
  >(
    (key) => {
      const copy = new Map(readingHistoryUserFilters);
      if (key === "all") {
        for (const [stateKey] of readingHistoryUserFilters) {
          copy.set(stateKey, true);
        }
      } else {
        const allSelected = Array.from(readingHistoryUserFilters).every(
          ([, value]) => {
            return value;
          }
        );
        if (allSelected && copy.size > 1) {
          for (const [stateKey] of readingHistoryUserFilters) {
            copy.set(stateKey, stateKey === key);
          }
        } else {
          copy.set(key, !copy.get(key));
        }
      }
      setReadingHistoryUserFilters(copy);
    },
    [readingHistoryUserFilters]
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
      mode === ScriptureMap2DModes.Viewer &&
      isReadingHistoryEnabled &&
      usersDataMap.size > 0
    );
  }, [mode, isReadingHistoryEnabled, usersDataMap, ScriptureMap2DModes]);

  useEffect(() => {
    if (shouldShowReadingHistory) {
      setShowingBooksColors(false);
    }
  }, [shouldShowReadingHistory]);

  return (
    <ReadingHistoryContext.Provider
      value={{
        myAuthBotId,
        yearlyReadingHistorySummary,
        rangedReadingEventsByBook,
        readingEventsByDay,
        dailyReadingHistorySummaries,
        readingHistoryUserFilters,
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
        selectedTimelineKey,
        setSelectedTimelineKey,
        timelineRangeMethod,
        setTimelineRangeMethod,
      }}
    >
      {children}
    </ReadingHistoryContext.Provider>
  );
};

export const useReadingHistoryContext: () => ReadingHistoryContextType = () => {
  const context = useContext(ReadingHistoryContext);

  if (!context) {
    throw new Error(
      "useReadingHistoryContext must be used within a ReadingHistoryContext"
    );
  }

  return context as ReadingHistoryContextType;
};
