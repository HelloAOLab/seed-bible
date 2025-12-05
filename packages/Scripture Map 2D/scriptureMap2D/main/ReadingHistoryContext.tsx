import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import {
  getReadingHistoryEvents,
  flat,
  calculateReadingHistorySummary,
} from "db.annotations.library";
import { useTabsContext } from "app.hooks.tabs";

const { createContext, useContext, useState, useMemo, useEffect, useCallback } =
  os.appHooks;

const ReadingHistoryContext = createContext();

export const ReadingHistoryProvider = ({ children }) => {
  const { activeTab } = useTabsContext();
  const { tick } = useTimeContext();

  const [readingHistoryRangeSeconds, setReadingHistoryRangeSeconds] =
    useState(null);
  const [readingHistoryUserFilters, setReadingHistoryUserFilters] = useState(
    new Map()
  );
  const [myAuthBotId, setMyAuthBotId] = useState(null);
  const [usersAuthId, setUsersAuthId] = useState([]);
  const [yearlyReadingHistorySummary, setYearlyReadingHistorySummary] =
    useState(null);
  const [rangedReadingEventsByBook, setRangedReadingEventsByBook] = useState(
    new Map()
  );
  const [dailyReadingHistorySummaries, setDailyReadingHistorySummaries] =
    useState(null);
  const [selectedUsersCount, setSelectedUsersCount] = useState(0);
  const [readingEventsByDay, setReadingEventsByDay] = useState(null);

  const trySetMyAuthBotId = useCallback(() => {
    if (!myAuthBotId) {
      os.requestAuthBotInBackground().then((authBot) => {
        const filtersCopy = new Map(readingHistoryUserFilters);
        filtersCopy.set(authBot.id, true);
        setMyAuthBotId(authBot.id);
        setReadingHistoryUserFilters(filtersCopy);
      });
    }
  }, [readingHistoryUserFilters, myAuthBotId]);

  const handleUserLoggedIn = useCallback(() => {
    trySetMyAuthBotId();
  }, [trySetMyAuthBotId]);

  useEffect(() => {
    globalThis.ScriptureMapHandleUserLoggedIn = handleUserLoggedIn;

    trySetMyAuthBotId();

    return () => {
      globalThis.ScriptureMapHandleUserLoggedIn = null;
    };
  }, []);

  useEffect(() => {
    if (myAuthBotId) setUsersAuthId((prev) => [...prev, myAuthBotId]);
  }, [myAuthBotId]);

  const {
    startOfWeekAYearAgoDate,
    weeksCount,
    sortedTimePeriods,
    greaterTimePeriodSeconds,
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
    const now = new Date();

    const getStartOfWeek = (date) => {
      const tempDate = new Date(date);
      tempDate.setDate(tempDate.getDate() - tempDate.getDay());
      tempDate.setHours(0, 0, 0, 0);
      return tempDate;
    };

    const startOfWeekDate = getStartOfWeek(now);

    const aYearAgoDate = new Date(now);
    aYearAgoDate.setFullYear(now.getFullYear() - 1);

    const startOfWeekAYearAgoDate = getStartOfWeek(aYearAgoDate);

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
      Math.floor((startOfWeekDate - startOfWeekAYearAgoDate) / MS_PER_WEEK) + 1;

    const sortedTimePeriods =
      BibleVizUtils.Data.masks.historyTimePeriodsInfo.toSorted(
        (periodInfoA, periodInfoB) => {
          return (
            periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()
          );
        }
      );
    const greaterTimePeriodSeconds =
      sortedTimePeriods[sortedTimePeriods.length - 1].GetTimePeriodInMs() /
      MS_PER_SECOND;

    const dayRangesMap = new Map();
    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > now.getDay()) break;
        const dayDate = new Date(startOfWeekAYearAgoDate);
        dayDate.setDate(dayDate.getDate() + week * 7 + day);
        const { start, end } = GetDayRangeSeconds(dayDate.getTime());
        dayRangesMap.set(`${week}-${day}`, { start, end });
      }
    }

    return {
      startOfWeekAYearAgoDate,
      weeksCount,
      sortedTimePeriods,
      greaterTimePeriodSeconds,
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
  }, []);

  const tryUpdateReadingHistoryUsersFilters = useCallback(() => {
    const newUsersIds = [];
    usersAuthId.forEach((userId) => {
      if (!readingHistoryUserFilters.has(userId)) {
        newUsersIds.push(userId);
      }
    });
    if (newUsersIds.length > 0) {
      const copy = new Map(readingHistoryUserFilters);
      newUsersIds.forEach((userId) => {
        copy.set(userId, false);
      });
      setReadingHistoryUserFilters(copy);
    }
  }, [readingHistoryUserFilters, usersAuthId]);

  useEffect(() => {
    tryUpdateReadingHistoryUsersFilters();
  }, [usersAuthId]);

  useEffect(() => {
    const selectedUsers = [];

    for (const [userId, selected] of readingHistoryUserFilters) {
      if (selected) {
        selectedUsers.push(userId);
      }
    }

    setSelectedUsersCount(selectedUsers.length);

    let summary = calculateReadingHistorySummary([]);
    const rangedEventsByBook = new Map();
    const eventsByDay = new Map();
    const dailySummaries = new Map();

    if (selectedUsers.length === 0) {
      setYearlyReadingHistorySummary(summary);
      setRangedReadingEventsByBook(rangedEventsByBook);
      setReadingEventsByDay(eventsByDay);
      setDailyReadingHistorySummaries(dailySummaries);
      return;
    }

    const startOfWeekAYearAgoSeconds = Math.floor(
      startOfWeekAYearAgoDate.getTime() / 1000
    );
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const allEventPromises = selectedUsers.map((recordName) =>
      getReadingHistoryEvents(
        recordName,
        startOfWeekAYearAgoSeconds,
        nowInSeconds
      )
    );

    const dayKeys = Array.from(dayRangesMap.keys());
    const {
      start: rangeStart = startOfWeekAYearAgoSeconds,
      end: rengeEnd = nowInSeconds,
    } = readingHistoryRangeSeconds ?? {};

    Promise.all(allEventPromises)
      .then((allEvents) => {
        const flattenedEvents = Array.from(flat(allEvents));

        for (let event of flattenedEvents) {
          let { start, end, chapter, bookId } = event;
          if (start >= rangeStart && end <= rengeEnd) {
            if (bookId === "PSA") {
              const { bookId: dividedPsalmId, chapter: dividedPsalmChapter } =
                BibleVizUtils.Functions.ConvertCompletePsalmsToDivided({
                  chapter,
                });
              event = {
                ...event,
                bookId: dividedPsalmId,
                chapter: dividedPsalmChapter,
              };
              ({ start, end, chapter, bookId } = event);
            }
            if (!rangedEventsByBook.has(bookId)) {
              rangedEventsByBook.set(bookId, []);
            }
            rangedEventsByBook.get(bookId).push(event);
          }

          const dayIndex = Math.floor(
            (start - startOfWeekAYearAgoSeconds) / SEC_PER_DAY
          );

          if (dayIndex >= 0 && dayIndex < dayKeys.length) {
            const key = dayKeys[dayIndex];

            if (!eventsByDay.has(key)) {
              eventsByDay.set(key, []);
            }
            eventsByDay.get(key).push(event);
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
  }, [tick, activeTab, readingHistoryUserFilters, readingHistoryRangeSeconds]);

  const handleReadingHistoryUserSelectorClick = useCallback(
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

  const handleReadingHistoryRangeSelectorClick = useCallback(
    (range) => {
      setReadingHistoryRangeSeconds(range);
    },
    [setReadingHistoryRangeSeconds]
  );

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
        startOfWeekAYearAgoDate,
        weeksCount,
        sortedTimePeriods,
        greaterTimePeriodSeconds,
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
        usersAuthId,
      }}
    >
      {children}
    </ReadingHistoryContext.Provider>
  );
};

export const useReadingHistoryContext = () => {
  return useContext(ReadingHistoryContext);
};

function GetDayRangeSeconds(timestamp) {
  const date = new Date(timestamp);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
}
