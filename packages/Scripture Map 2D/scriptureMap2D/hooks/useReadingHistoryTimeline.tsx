import type {
  Range,
  ReadingHistoryContentData,
  TooltipContentData,
} from "scriptureMap2D.main.types";
import {
  CapitalizeFirstLetter,
  GetPastDateInfo,
} from "bibleVizUtils.functions.index";
import type { HexString } from "bibleVizUtils.models.commonTypes";
import { readingHistoryService } from "bibleVizUtils.services.index";
import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import { useReadingHistoryContext } from "scriptureMap2D.contexts.RadingHistory.ReadingHistoryContext";
import { useSideBarContext } from "app.hooks.sideBar";
import { userColorStore } from "bibleVizUtils.services.index";
import type { MutableRef } from "../../../../typings/AuxLibraryDefinitions";
const { useCallback, useMemo, useEffect, useRef } = os.appHooks;

const step = 0.25;
type ItemsColorMap = Map<string, React.CSSProperties["color"]>;

interface UseReadingHistoryTimelineType {
  itemsData: ReadingHistoryContentData[];
  timelineRef: MutableRef<HTMLDivElement | null>;
}

type UseReadingHistoryTimeline = () => UseReadingHistoryTimelineType;

export const useReadingHistoryTimeline: UseReadingHistoryTimeline = () => {
  const { t, themeColors } = useSideBarContext();

  const {
    startDateStartOfWeek,
    readingHistoryRangeSeconds,
    handleReadingHistoryRangeSelectorClick,
    weeksCount,
    SEC_PER_HOUR,
    SEC_PER_MINUTE,
    dayRangesMap,
    dailyReadingHistorySummaries,
    myAuthBotId,
    timelineRange,
    yearlyReadingHistorySummary,
  } = useReadingHistoryContext();

  const { tick } = useTimeContext();

  const timelineRef = useRef<HTMLDivElement | null>(null);

  const prevItemsColorMapRef = useRef<ItemsColorMap>(new Map());

  const handleItemClick = useCallback<(range: Range | null) => void>(
    (range) => {
      handleReadingHistoryRangeSelectorClick(range);
    },
    [handleReadingHistoryRangeSelectorClick]
  );

  const itemsColorMap = useMemo<ItemsColorMap>(() => {
    const colorMap: ItemsColorMap = new Map();
    if (!dailyReadingHistorySummaries || !yearlyReadingHistorySummary)
      return colorMap;

    const yearlySummaryUsersCount = Object.keys(
      yearlyReadingHistorySummary.users
    ).length;

    let shouldReassign = false;
    const fullColorTimeSeconds = yearlySummaryUsersCount * SEC_PER_HOUR; // 1 hour per selected user
    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > timelineRange.endDate.getDay())
          break;

        const key = `${week}-${day}`;

        const summary = dailyReadingHistorySummaries.get(key);
        let color: React.CSSProperties["color"] | undefined;
        const prevColor = prevItemsColorMapRef.current.get(key);

        if (summary && summary.totalTimeSpentReading > SEC_PER_MINUTE) {
          const usersKeys = Object.keys(summary.users);
          let userColor: HexString | undefined;
          if (usersKeys.length > 1) {
            userColor = themeColors?.["1"]?.secondaryColor ?? "#D2691E"; // Hardcoded primary color. Must be accesible in the future
          } else {
            const userKey = usersKeys[0] as string;
            userColor = userColorStore.getUserColor({
              authId: userKey,
            });
          }
          if (userColor) {
            const colorData = {
              baseColor: themeColors?.["1"]?.firstToolbarbutton ?? "#dfdede", // Hardcoded firstToolbarbutton. Must be accesible in the future
              step,
              readingTimeSeconds: summary.totalTimeSpentReading,
              fullColorTimeSeconds,
              userColor,
            };
            color = readingHistoryService.getColorByReadingTime(colorData);
          }
        }

        if (!shouldReassign && prevColor !== color) shouldReassign = true;

        colorMap.set(key, color);
      }
    }

    if (shouldReassign) {
      prevItemsColorMapRef.current = colorMap;
      return colorMap;
    }

    return prevItemsColorMapRef.current;
  }, [
    tick,
    dailyReadingHistorySummaries,
    yearlyReadingHistorySummary,
    myAuthBotId,
    themeColors,
  ]);

  const itemsData = useMemo(() => {
    const itemsData: UseReadingHistoryTimelineType["itemsData"] = [];
    const monthsSet = new Set();
    const monthLabelGridRow = `1 / 2`;
    const dayLabelGridColumn = `1 / 2`;
    const todayDate = new Date();

    const translatedMonday = t("monShort");
    const translatedWednesday = t("wedShort");
    const translatedFriday = t("friShort");

    itemsData.push(
      {
        type: "label",
        gridRow: `3 / 4`,
        gridColumn: dayLabelGridColumn,
        isDay: true,
        key: translatedMonday,
        children: translatedMonday,
      },
      {
        type: "label",
        gridRow: `5 / 6`,
        gridColumn: dayLabelGridColumn,
        isDay: true,
        key: translatedWednesday,
        children: translatedWednesday,
      },
      {
        type: "label",
        gridRow: `7 / 8`,
        gridColumn: dayLabelGridColumn,
        isDay: true,
        key: translatedFriday,
        children: translatedFriday,
      }
    );

    for (let week = 0; week < weeksCount; week++) {
      const lastDayIndex =
        week === weeksCount - 1 ? timelineRange.endDate.getDay() : 6;
      const labelDate = new Date(startDateStartOfWeek.getTime());
      labelDate.setDate(labelDate.getDate() + week * 7 + lastDayIndex);
      const labelDateInfo = GetPastDateInfo(labelDate.getTime());
      const uniqueMonthKey = `${labelDateInfo.month}-${labelDateInfo.year}`;

      if (!monthsSet.has(uniqueMonthKey)) {
        monthsSet.add(uniqueMonthKey);

        const monthLabelGridColumn = `${week + 2} / ${week + 4}`;
        const fixedName = CapitalizeFirstLetter(labelDateInfo.monthName);

        itemsData.push({
          type: "label",
          gridRow: monthLabelGridRow,
          gridColumn: monthLabelGridColumn,
          isDay: false,
          key: `label-${uniqueMonthKey}`,
          children: fixedName,
        });
      }

      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > timelineRange.endDate.getDay())
          break;

        const key = `${week}-${day}`;
        const dayDate = new Date(startDateStartOfWeek);
        dayDate.setDate(dayDate.getDate() + week * 7 + day);
        const time = dayDate.getTime();
        const range = dayRangesMap.get(key);

        const { day: dayOfTheMonth, monthName, year } = GetPastDateInfo(time);
        const daySummary = dailyReadingHistorySummaries?.get?.(key);

        const tooltipContentsData: TooltipContentData[] = [];
        let timeSpentMinutes = 0;

        if (daySummary) {
          const timeSpent = daySummary.totalTimeSpentReading ?? 0;
          timeSpentMinutes = Math.floor(timeSpent / SEC_PER_MINUTE);
        }

        tooltipContentsData.push({
          type: "readingHistoryHeader",
          monthName: monthName,
          dayOfTheMonth: dayOfTheMonth,
          year: year,
          minutesCount: timeSpentMinutes,
        });
        const isTimeSpentNoticeable = timeSpentMinutes > 1; // more than 1 minute

        if (daySummary && isTimeSpentNoticeable) {
          const userTimes: [string, number][] = [];
          for (const userId in daySummary.users) {
            const userSummary = daySummary.users[userId];
            if (userSummary) {
              const userTimeSpentSeconds = userSummary.totalTimeSpentReading;
              userTimes.push([userId, userTimeSpentSeconds]);
            }
          }
          const sortedUsers = userTimes
            .toSorted(([, timeSpentA], [, timeSpentB]) => {
              return timeSpentB - timeSpentA;
            })
            .map(([userId]) => {
              return userId;
            });
          const topUsers = sortedUsers.slice(0, 3);
          const extraUsers = sortedUsers.slice(3);

          for (const userId of topUsers) {
            const userSummary = daySummary.users[userId];
            if (userSummary) {
              const { totalTimeSpentReading: userTimeSpentSeconds } =
                userSummary;
              const minutesCount = Math.max(
                1,
                Math.floor(userTimeSpentSeconds / SEC_PER_MINUTE)
              );
              const fixedContent = `(${minutesCount} Min)`;
              tooltipContentsData.push({
                type: "readingHistory",
                userId: userId,
                fixedContent: fixedContent,
              });
            }
          }
          if (extraUsers.length > 0) {
            const extraTimeSpentSeconds = Math.max(
              extraUsers.reduce((curr, userId) => {
                const userSummary = daySummary.users[userId];
                let amount = 0;
                if (userSummary) {
                  amount = userSummary.totalTimeSpentReading;
                }
                return curr + amount;
              }, 0),
              1
            );
            let extraActivityContent: string;
            if (extraTimeSpentSeconds > SEC_PER_HOUR) {
              const hoursCount = Math.floor(
                extraTimeSpentSeconds / SEC_PER_HOUR
              );
              extraActivityContent =
                hoursCount > 1
                  ? `+${extraUsers.length} ${t("spentHours", { count: hoursCount })}`
                  : `+${extraUsers.length} ${t("spentHour", { count: hoursCount })}`;
            } else {
              const minutesCount = Math.max(
                1,
                Math.floor(extraTimeSpentSeconds / SEC_PER_MINUTE)
              );
              extraActivityContent =
                minutesCount > 1
                  ? `+${extraUsers.length} ${t("spentMinutes", { count: minutesCount })}`
                  : `+${extraUsers.length} ${t("spentMinute", { count: minutesCount })}`;
            }
            tooltipContentsData.push({
              type: "text",
              content: extraActivityContent,
            });
          }
        }

        const itemGridRow = `${day + 2} / ${day + 3}`;
        const itemGridColumn = `${week + 2} / ${week + 3}`;
        const style = {
          gridRow: itemGridRow,
          gridColumn: itemGridColumn,
          background: itemsColorMap?.get?.(key),
        };
        const isUpcoming = time > todayDate.getTime();

        if (range) {
          itemsData.push({
            type: "item",
            id: key,
            key: `${week}-${day}-${dayOfTheMonth}-${monthName}-${year}`,
            tooltipContentsData: tooltipContentsData,
            range: range,
            handleItemClick: handleItemClick,
            readingHistoryRangeSeconds: readingHistoryRangeSeconds,
            style: style,
            isUpcoming: isUpcoming,
          });
        }
      }
    }

    return itemsData;
  }, [itemsColorMap, readingHistoryRangeSeconds, dailyReadingHistorySummaries]);

  useEffect(() => {
    const lastKey = Array.from(dayRangesMap.keys()).pop();
    if (lastKey) {
      const element = document.getElementById(lastKey);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth", // smooth scrolling animation
          block: "center", // scroll so it's centered in the viewport
        });
      }
    }
    const el = timelineRef.current;

    if (!el) return;

    const handleWheel: (event: WheelEvent) => void = (e) => {
      if (e.deltaY === 0) return;

      const isScrollable = el.scrollWidth > el.clientWidth;

      if (isScrollable) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return {
    itemsData,
    timelineRef,
  };
};
