import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import {
  getReadingHistoryEvents,
  flat,
  calculateReadingHistorySummary,
} from "db.annotations.library";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";

const { createContext, useContext, useState, useMemo, useEffect } = os.appHooks;

const ReadingHistoryContext = createContext();

export const ReadingHistoryProvider = ({ children }) => {
  const { readingHistoryUsersFilters, readingHistoryRange } =
    useScriptureMap2DContext();
  const { tick } = useTimeContext();

  const [myAuthBotId, setMyAuthBotId] = useState(null);
  const [usersAuthId, setUsersAuthId] = useState([]);
  const [readingHistorySummary, setReadingHistorySummary] = useState(null);

  useEffect(() => {
    os.requestAuthBotInBackground().then((authBot) => {
      setMyAuthBotId(authBot.id);
    });
  }, []);

  useEffect(() => {
    setUsersAuthId([myAuthBotId]);
  }, [myAuthBotId]);

  const {
    now,
    startOfWeek,
    startOfWeekAYearAgo,
    weeksCount,
    rangeStartSeconds,
    rangeEndSeconds,
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

    return {
      now,
      startOfWeek,
      startOfWeekAYearAgo,
      weeksCount,
      rangeStartSeconds,
      rangeEndSeconds,
    };
  }, []);

  useEffect(() => {
    if (usersAuthId.length === 0) return;

    const startOfWeekAYearAgoSeconds = Math.floor(
      startOfWeekAYearAgo.getTime() / 1000
    );
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const start = rangeStartSeconds ?? startOfWeekAYearAgoSeconds;
    const end = rangeEndSeconds ?? nowInSeconds;

    const allEventPromises = usersAuthId.map((recordName) =>
      getReadingHistoryEvents(recordName, start, end)
    );
    Promise.all(allEventPromises).then((allEvents) => {
      const flattenedEvents = flat(allEvents);
      const summary = calculateReadingHistorySummary(flattenedEvents);
      setReadingHistorySummary(summary);
    });
  }, [tick, rangeStartSeconds, rangeEndSeconds, usersAuthId]);

  useEffect(() => {
    console.log(`[Debug] ReadingHistoryContext readingHistorySummary updated`, {
      readingHistorySummary,
    });
  }, [readingHistorySummary]);

  return (
    <ReadingHistoryContext.Provider value={{}}>
      {children}
    </ReadingHistoryContext.Provider>
  );
};

export const useReadingHistoryContext = () => {
  return useContext(ReadingHistoryContext);
};
