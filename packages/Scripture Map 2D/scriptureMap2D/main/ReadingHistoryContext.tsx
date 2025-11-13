import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import {
  getReadingHistoryEvents,
  flat,
  calculateReadingHistorySummary,
} from "db.annotations.library";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";

const { createContext, useContext, useState, useMemo, useEffect, useCallback } =
  os.appHooks;

const ReadingHistoryContext = createContext();

export const ReadingHistoryProvider = ({ children }) => {
  const { tick } = useTimeContext();

  const [readingHistoryRange, setReadingHistoryRange] = useState(null);
  const [readingHistoryUserFilters, setReadingHistoryUserFilters] = useState(
    new Map()
  );
  const [myAuthBotId, setMyAuthBotId] = useState(null);
  const [usersAuthId, setUsersAuthId] = useState([]);
  const [readingHistorySummary, setReadingHistorySummary] = useState(null);
  const [readingEventsByBook, setReadingEventsByBook] = useState(new Map());

  useEffect(() => {
    os.requestAuthBotInBackground().then((authBot) => {
      setMyAuthBotId(authBot.id);
    });
  }, []);

  useEffect(() => {
    setUsersAuthId([myAuthBotId]);
  }, [myAuthBotId]);

  const {
    startOfWeekAYearAgo,
    weeksCount,
    rangeStartSeconds,
    rangeEndSeconds,
    sortedTimePeriods,
    greaterTimePeriodTime,
  } = useMemo(() => {
    let rangeStartSeconds, rangeEndSeconds;
    const now = new Date();

    const getStartOfWeek = (date) => {
      const tempDate = new Date(date);
      tempDate.setDate(tempDate.getDate() - tempDate.getDay());
      tempDate.setHours(0, 0, 0, 0);
      return tempDate;
    };

    const startOfWeek = getStartOfWeek(now);

    const aYearAgo = new Date(now);
    aYearAgo.setFullYear(now.getFullYear() - 1);

    const startOfWeekAYearAgo = getStartOfWeek(aYearAgo);

    const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;
    const weeksCount =
      Math.floor((startOfWeek - startOfWeekAYearAgo) / MS_PER_WEEK) + 1;

    if (readingHistoryRange) {
      const { start, end } = readingHistoryRange;
      rangeStartSeconds = Math.floor(start / 1000);
      rangeEndSeconds = Math.floor(end / 1000);
    }
    const sortedTimePeriods =
      BibleVizUtils.Data.masks.historyTimePeriodsInfo.toSorted(
        (periodInfoA, periodInfoB) => {
          return (
            periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()
          );
        }
      );
    const greaterTimePeriodTime =
      sortedTimePeriods[sortedTimePeriods.length - 1].GetTimePeriodInMs();

    return {
      startOfWeekAYearAgo,
      weeksCount,
      rangeStartSeconds,
      rangeEndSeconds,
      sortedTimePeriods,
      greaterTimePeriodTime,
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

    if (selectedUsers.length === 0) return;

    const readingEventsByBook = new Map();

    const startOfWeekAYearAgoSeconds = Math.floor(
      startOfWeekAYearAgo.getTime() / 1000
    );
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const start = rangeStartSeconds ?? startOfWeekAYearAgoSeconds;
    const end = rangeEndSeconds ?? nowInSeconds;

    const allEventPromises = selectedUsers.map((recordName) =>
      getReadingHistoryEvents(recordName, start, end)
    );
    Promise.all(allEventPromises).then((allEvents) => {
      const flattenedEvents = flat(allEvents);

      for (const event of flattenedEvents) {
        const { bookId } = event;
        if (!readingEventsByBook.has(bookId)) {
          readingEventsByBook.set(bookId, []);
        }
        readingEventsByBook.get(bookId).push(event);
      }

      const summary = calculateReadingHistorySummary(flattenedEvents);
      setReadingHistorySummary(summary);
      setReadingEventsByBook(readingEventsByBook);
    });
  }, [tick, rangeStartSeconds, rangeEndSeconds, readingHistoryUserFilters]);

  const handleReadingHistoryUserSelectorClick = useCallback(
    (key) => {
      const copy = new Map(readingHistoryUserFilters);
      if (key === "all") {
        Array.from(readingHistoryUserFilters).forEach(([stateKey]) => {
          copy.set(stateKey, true);
        });
      } else {
        const allSelected = Array.from(readingHistoryUserFilters).every(
          ([, value]) => {
            return value;
          }
        );
        if (allSelected) {
          Array.from(readingHistoryUserFilters).forEach(([stateKey]) => {
            copy.set(stateKey, stateKey === key);
          });
        } else {
          copy.set(key, !copy.get(key));
        }
      }
      setReadingHistoryUserFilters(copy);
    },
    [readingHistoryUserFilters]
  );

  const handleReadingHistoryRangeSelectorClick = useCallback((range) => {
    setReadingHistoryRange(range);
  }, []);

  return (
    <ReadingHistoryContext.Provider
      value={{
        myAuthBotId,
        readingHistorySummary,
        readingEventsByBook,
        readingHistoryUserFilters,
        handleReadingHistoryUserSelectorClick,
        readingHistoryRange,
        handleReadingHistoryRangeSelectorClick,
        startOfWeekAYearAgo,
        weeksCount,
        sortedTimePeriods,
        greaterTimePeriodTime,
      }}
    >
      {children}
    </ReadingHistoryContext.Provider>
  );
};

export const useReadingHistoryContext = () => {
  return useContext(ReadingHistoryContext);
};
