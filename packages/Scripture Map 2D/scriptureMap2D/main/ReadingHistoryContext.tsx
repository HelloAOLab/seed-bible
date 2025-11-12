import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import { getReadingHistorySummary } from "db.annotations.library";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";

const { createContext, useContext, useState, useMemo, useEffect } = os.appHooks;

const ReadingHistoryContext = createContext();

export const ReadingHistoryProvider = ({ children }) => {
  const [usersAuthId, setUsersAuthId] = useState([]);

  const { now, startOfWeek, startOfWeekAYearAgo, weeksCount } = useMemo(() => {
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

    return { now, startOfWeek, startOfWeekAYearAgo, weeksCount };
  }, []);

  const { readingHistoryUsersFilters, readingHistoryRange } =
    useScriptureMap2DContext();
  const { tick } = useTimeContext();
  const { rangeStartSeconds, rangeEndSeconds } = useMemo(() => {
    if (!readingHistoryRange) return {};
    const { start, end } = readingHistoryRange;
    return {
      rangeStartSeconds: Math.floor(start / 1000),
      rangeEndSeconds: Math.floor(end / 1000),
    };
  }, []);

  const [readingHistorySummaries, setReadingHistorySummaries] = useState(null);

  useEffect(() => {
    const ids = [];
    os.requestAuthBotInBackground().then((authBot) => {
      if (authBot) {
        ids.push(authBot.id);
      }
    });
    setUsersAuthId(ids);
  }, []);

  useEffect(() => {
    if (usersAuthId.length === 0) return;

    const startOfWeekAYearAgoSeconds = Math.floor(
      startOfWeekAYearAgo.getTime() / 1000
    );
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const start = rangeStartSeconds ?? startOfWeekAYearAgoSeconds;
    const end = rangeEndSeconds ?? nowInSeconds;
    getReadingHistorySummary(authBot.id, start, end);

    Promise.all(
      usersAuthId.map((authId) => {
        return getReadingHistorySummary(authId, start, end);
      })
    ).then((summaries) => {
      const filteredSummaries = summaries.filter(Boolean);
      setReadingHistorySummaries(filteredSummaries);
    });
  }, [tick, rangeStartSeconds, rangeEndSeconds, usersAuthId]);

  useEffect(() => {
    console.log(
      `[Debug] ReadingHistoryContext readingHistorySummaries updated`,
      { readingHistorySummaries }
    );
  }, [readingHistorySummaries]);

  return (
    <ReadingHistoryContext.Provider value={{}}>
      {children}
    </ReadingHistoryContext.Provider>
  );
};

export const useReadingHistoryContext = () => {
  return useContext(ReadingHistoryContext);
};
