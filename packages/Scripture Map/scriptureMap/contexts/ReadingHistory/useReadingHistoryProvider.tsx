import type { ReadingHistoryContextType } from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";
import type {
  RangedReadingEventsByBook,
  ReadingEventsByDay,
  DailyReadingHistorySummaries,
  ReadingHistoryUserFilters,
  DateRange,
  KeyRangesMap,
  TimelineRangesMap,
  TimelineRangeMethodType,
} from "scriptureMap.models.readingHistory";
import { TimelineRangeMethod } from "scriptureMap.models.readingHistory";
import { useTimeContext } from "scriptureMap.contexts.Time.TimeContext";
import {
  getReadingHistoryEvents,
  flat,
  calculateReadingHistorySummary,
} from "seed-bible.managers.ReadingHistoryManager";
import type { ReadingHistorySummary } from "seed-bible.managers.ReadingHistoryManager";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import type { Range } from "scriptureMap.models.commonTypes";
// import type { UserData } from "scriptureMap.models.user";
import type { UsersDataMap } from "scriptureMap.models.user";
import { ScriptureMapModes } from "scriptureMap.models.scriptureMap";
// import type { SubscribedUser } from "bibleVizUtils.domain.models.subscriptions";
import type { ConnectedUserData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/userPresence";

// const getSubscribedUsers: () => Promise<SubscribedUser[]> = async () => {
//   return [];
// }; // TODO: Correctly defined this.

const { useState, useMemo, useEffect, useCallback } = os.appHooks;

type UseReadingHistoryProvider = () => ReadingHistoryContextType;

const timelineMinYear = 2023;

const initialTimelineRangeKey = new Date().getFullYear();

export const useReadingHistoryProvider: UseReadingHistoryProvider = () => {
  const {
    mode,
    isReadingHistoryEnabled,
    setShowingBooksColors,
    seedBibleState,
    bibleVizUtilsEventManager,
    // scriptureMapEventManager,
    // scriptureService,
    getDayRangeSeconds,
    sessionProvider,
    // arrangementService
  } = useScriptureMapContext();

  const selectedTabId = seedBibleState.tabs.selectedTabId.value;

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

  useEffect(() => {
    console.log(`[Debug] useReadingHistoryProvider`, {
      readingHistoryUserFilters,
    });
  }, [readingHistoryUserFilters]);

  const handleUserLoggedIn = useCallback(() => {
    if (!myAuthBotId) {
      setMyAuthBotId(authBot.id);
      setReadingHistoryUserFilters((prevFilters) => {
        const filtersCopy = new Map(prevFilters);
        filtersCopy.set(authBot.id, true);
        return filtersCopy;
      });
    }
  }, [myAuthBotId, setReadingHistoryUserFilters, setMyAuthBotId]);

  const trySetMyAuthBotId = useCallback(() => {
    if (authBot) {
      handleUserLoggedIn();
    }
  }, [handleUserLoggedIn]);

  const fetchUsersDataMap = useCallback<() => UsersDataMap | null>(() => {
    if (!myAuthBotId) return null;

    try {
      // const componentsBot = getBot(byTag("system", "app.components"));
      const loggedUsers = sessionProvider
        .getConnectedUsers()
        ?.filter((userIds) => {
          return userIds.authId; // && userIds.configId !== myAuthBotId
        });
      // const subscribedUsers = await getSubscribedUsers();

      // if (!subscribedUsers) return null;

      // const allAuthBotIds = [
      //   myAuthBotId,
      // ...subscribedUsers.map((user) => user.id),
      // ...loggedUsers
      // ];

      // const dataPromises: Promise<UserData>[] = allAuthBotIds.map(
      //   async (id) => {
      //     const firstResult = await os.getData(id, id);
      //     if (firstResult.success) return { ...firstResult.data, id };

      //     const secondResult = await os.getData(componentsBot.tags.key, id);
      //     if (secondResult.success) return { ...secondResult.data, id };

      //     return undefined;
      //   }
      // );

      // let rawUsersData = await Promise.all(dataPromises);
      // rawUsersData = rawUsersData.filter(Boolean);

      const newUsersData: Map<string, ConnectedUserData> = new Map(
        loggedUsers.map((user) => {
          return [user.authId!, user];
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
    trySetMyAuthBotId();
  }, []);

  useEffect(() => {
    const unsubscribeUserLoggedIn = bibleVizUtilsEventManager.subscribe(
      "OnUserLoggedIn",
      () => {
        handleUserLoggedIn();
      }
    );
    const unsubscribeOnlineUsersChanged = bibleVizUtilsEventManager.subscribe(
      "OnlineUsersChanged",
      () => {
        refreshUsersDataMap();
      }
    );
    // const unsubscribeSubscriptionsChanged =
    //   scriptureMapEventManager.subscribe(
    //     "SubscriptionsChanged",
    //     refreshUsersDataMap
    //   );

    return () => {
      unsubscribeUserLoggedIn();
      unsubscribeOnlineUsersChanged();
      // unsubscribeSubscriptionsChanged();
    };
  }, [handleUserLoggedIn, refreshUsersDataMap]);

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

  const tryUpdateReadingHistoryUsersFilters = useCallback(() => {
    // Wait until we know who the local user is. Reconciling with a stale (null)
    // `myAuthBotId` would treat the local user — added by `handleUserLoggedIn`
    // via `authBot.id` — as a foreign key and delete it from the filters.
    if (!myAuthBotId) return;

    setReadingHistoryUserFilters((prev) => {
      const next = new Map(prev);

      let changed = false;
      const usersAuthIds = Array.from(usersDataMap.keys());

      usersAuthIds.forEach((userId) => {
        if (!next.has(userId)) {
          next.set(userId, userId === myAuthBotId);
          changed = true;
        }
      });

      Array.from(next.keys()).forEach((key) => {
        if (
          key !== myAuthBotId &&
          !usersAuthIds.some((userId) => userId === key)
        ) {
          next.delete(key);
          changed = true;
        }
      });

      if (changed) {
        // console.log(
        //   `[Debug] useReadingHistoryProvider calling setReadingHistoryUserFilters from tryUpdateReadingHistoryUsersFilters`
        // );
        return next;
      }

      return prev;
    });
  }, [usersDataMap, setReadingHistoryUserFilters, myAuthBotId]);

  useEffect(() => {
    tryUpdateReadingHistoryUsersFilters();
  }, [tryUpdateReadingHistoryUsersFilters]);

  useEffect(() => {
    let isMounted = true;
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
      // console.log(
      //   `[Debug] useReadingHistoryProvider calling setReadingHistoryUserFilters from handleReadingHistoryUserSelectorClick`
      // );

      setReadingHistoryUserFilters(copy);
    },
    [readingHistoryUserFilters, setReadingHistoryUserFilters]
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
  };
};
