import type { TooltipContentData } from "../components/containers/Tooltip";
import type { HexString } from "../../seed-bible-utils/domain/models/commonTypes";
import { useTimeContext } from "../contexts/Time/TimeContext";
import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";
import { useReadingHistoryContext } from "../contexts/ReadingHistory/ReadingHistoryContext";
import type { MutableRef } from "preact/hooks";
import type { ReadingHistoryContentData } from "../../seed-bible-utils/infrastructure/presentation/components/ui/ReadingHistoryTimeline";
import type { Range } from "../models/commonTypes";

import { useCallback, useMemo, useEffect, useRef } from "preact/hooks";

const step = 0.25;
type ItemsColorMap = Map<string, React.CSSProperties["color"]>;

interface UseReadingHistoryTimelineType {
  itemsData: ReadingHistoryContentData<TooltipContentData>[];
  timelineRef: MutableRef<HTMLDivElement | null>;
}

type UseReadingHistoryTimeline = () => UseReadingHistoryTimelineType;

export const useReadingHistoryTimeline: UseReadingHistoryTimeline = () => {
  const {
    readingHistoryService,
    userColorStore,
    translate,
    seedBibleState,
    CapitalizeFirstLetter,
    GetPastDateInfo,
    language,
  } = useScriptureMapContext();

  const theme = seedBibleState.theme.currentTheme.value;

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
            userColor = theme.variables.secondaryColor;
          } else {
            const userKey = usersKeys[0] as string;
            userColor = userColorStore.getUserColor({
              authId: userKey,
            });
          }
          if (userColor) {
            const colorData = {
              baseColor:
                theme.variables.readerToolbarFloatingButtonBackground ??
                "#dfdede",
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
    theme,
  ]);

  const itemsData = useMemo(() => {
    const itemsData: UseReadingHistoryTimelineType["itemsData"] = [];
    const monthsSet = new Set();
    const monthLabelGridRow = `1 / 2`;
    const dayLabelGridColumn = `1 / 2`;
    const todayDate = new Date();

    const translatedMonday = translate("monday-short");
    const translatedWednesday = translate("wednesday-short");
    const translatedFriday = translate("friday-short");

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
      const labelDateInfo = GetPastDateInfo(labelDate.getTime(), language);
      const uniqueMonthKey = `${labelDateInfo.month}-${labelDateInfo.year}`;

      if (!monthsSet.has(uniqueMonthKey)) {
        monthsSet.add(uniqueMonthKey);

        const nextWeek = week + 1;
        let nextWeekMonthKey: string | null = null;
        if (nextWeek < weeksCount) {
          const nextLastDayIndex =
            nextWeek === weeksCount - 1 ? timelineRange.endDate.getDay() : 6;
          const nextLabelDate = new Date(startDateStartOfWeek.getTime());
          nextLabelDate.setDate(
            nextLabelDate.getDate() + nextWeek * 7 + nextLastDayIndex
          );
          const nextLabelDateInfo = GetPastDateInfo(
            nextLabelDate.getTime(),
            language
          );
          nextWeekMonthKey = `${nextLabelDateInfo.month}-${nextLabelDateInfo.year}`;
        }

        if (!nextWeekMonthKey || nextWeekMonthKey === uniqueMonthKey) {
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
      }

      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > timelineRange.endDate.getDay())
          break;

        const key = `${week}-${day}`;
        const dayDate = new Date(startDateStartOfWeek);
        dayDate.setDate(dayDate.getDate() + week * 7 + day);
        const time = dayDate.getTime();
        const range = dayRangesMap.get(key);

        const {
          day: dayOfTheMonth,
          monthName,
          year,
        } = GetPastDateInfo(time, language);
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
            const isMe = userId === myAuthBotId;
            const userName = CapitalizeFirstLetter(
              isMe ? translate("you") : translate("guest")
            );
            const userColor = userColorStore.getUserColor({ authId: userId });
            const dotStyle = { backgroundColor: userColor };

            if (userSummary) {
              const { totalTimeSpentReading: userTimeSpentSeconds } =
                userSummary;
              const minutesCount = Math.max(
                1,
                Math.floor(userTimeSpentSeconds / SEC_PER_MINUTE)
              );
              const fixedContent = translate("minutes-count", {
                count: minutesCount,
              });
              tooltipContentsData.push({
                type: "readingHistory",
                userName,
                dotStyle,
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
                  ? translate("users-extra-hours-spent", {
                      users: extraUsers.length,
                      count: hoursCount,
                    })
                  : translate("users-extra-hour-spent", {
                      users: extraUsers.length,
                      count: hoursCount,
                    });
            } else {
              const minutesCount = Math.max(
                1,
                Math.floor(extraTimeSpentSeconds / SEC_PER_MINUTE)
              );
              extraActivityContent =
                minutesCount > 1
                  ? translate("users-extra-minutes-spent", {
                      users: extraUsers.length,
                      count: minutesCount,
                    })
                  : translate("users-extra-minute-spent", {
                      users: extraUsers.length,
                      count: minutesCount,
                    });
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
            handleItemClick,
            readingHistoryRangeSeconds: readingHistoryRangeSeconds,
            style: style,
            isUpcoming: isUpcoming,
          });
        }
      }
    }

    return itemsData;
  }, [
    itemsColorMap,
    readingHistoryRangeSeconds,
    dailyReadingHistorySummaries,
    myAuthBotId,
    translate,
  ]);

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
