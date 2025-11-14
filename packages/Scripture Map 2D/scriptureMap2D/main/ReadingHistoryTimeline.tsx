import {
  Tooltip,
  ReadingHistoryTooltipContent,
} from "scriptureMap2D.main.Tooltip";
import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import { getUserReadingHistorySummary } from "db.annotations.library";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

const { useState, useCallback, useMemo, useEffect, useRef } = os.appHooks;
const { memo } = os.appCompat;

const step = 0.25;
const stepColors = ["#E3E3E3", "#FFEEA9", "#FFBF78", "#D36433", "#7B4019"];

const Label = memo(({ gridRow, gridColumn, children, isDay }) => {
  const style = useMemo(() => {
    return { gridRow, gridColumn };
  }, [gridRow, gridColumn]);

  return (
    <div
      style={style}
      className={`readingHistoryTimeline-label readingHistoryTimeline-label-${isDay ? "day" : "month"}`}
    >
      {children}
    </div>
  );
});

const Item = memo(
  ({
    backgroundColor,
    gridRow,
    gridColumn,
    tooltipContent,
    handleItemClick,
    range,
    readingHistoryRange,
    id,
  }) => {
    const selected = useMemo(() => {
      return range === readingHistoryRange;
    }, [range, readingHistoryRange]);

    const style = useMemo(() => {
      return { backgroundColor, gridRow, gridColumn };
    }, [backgroundColor, gridRow, gridColumn]);

    const [containerRect, setContainerRect] = useState(null);

    const { tooltipAnchor } = useMemo(() => {
      let tooltipAnchor;

      if (containerRect) {
        tooltipAnchor = {
          x: containerRect.left + containerRect.width / 2,
          y: containerRect.top,
          width: containerRect.width,
          height: containerRect.height,
        };
      }

      return { tooltipAnchor };
    }, [containerRect]);

    return (
      <div
        id={id}
        onPointerEnter={(e) =>
          setContainerRect(e.currentTarget.getBoundingClientRect())
        }
        onPointerLeave={() => setContainerRect(null)}
        style={style}
        className={`readingHistoryTimeline-item${selected ? " selected" : ""}`}
        onClick={() => {
          handleItemClick(selected ? null : range);
        }}
      >
        {containerRect && (
          <Tooltip anchor={tooltipAnchor} content={tooltipContent} />
        )}
      </div>
    );
  }
);

export const ReadingHistoryTimeline = () => {
  const {
    readingHistoryRange,
    handleReadingHistoryRangeSelectorClick,
    startOfWeekAYearAgo,
    weeksCount,
  } = useReadingHistoryContext();
  const { tick } = useTimeContext();

  const prevItemsColorMapRef = useRef(new Map());

  const handleItemClick = useCallback((range) => {
    handleReadingHistoryRangeSelectorClick(range);
  }, []);

  const dayRangesMap = useMemo(() => {
    const map = new Map();
    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > now.getDay()) break;
        const dayDate = new Date(startOfWeekAYearAgo);
        dayDate.setDate(dayDate.getDate() + week * 7 + day);
        const { start, end } = GetDayRange(dayDate.getTime());
        map.set(`${week}-${day}`, { start, end });
      }
    }
    return map;
  }, [weeksCount, startOfWeekAYearAgo]);

  const computeEntriesMap = useCallback(
    (currReadingHistorySummary, currDayRangesMap) => {
      const dayKeys = Array.from(currDayRangesMap.keys());
      const dayRanges = Array.from(currDayRangesMap.values());
      const dailyEntriesBreakdownMap = new Map(
        dayKeys.map((key) => {
          return [
            key,
            {
              timeSpent: 0,
              usersCount: 0,
              usersMap: new Map(),
              ungroupedEntries: [],
            },
          ];
        })
      );
      const now = Date.now();

      const DAY_MS = 1000 * 60 * 60 * 24;
      const firstDayStart = dayRanges[0].start;

      for (const userId in currReadingHistorySummary) {
        const userEntries = currReadingHistorySummary[userId];
        for (const bookId in userEntries) {
          const bookEntries = userEntries[bookId];
          for (const chapter in bookEntries) {
            const chapterEntries = bookEntries[chapter];
            for (const entry of chapterEntries) {
              const { start, end = now } = entry;
              const dayIndex = Math.floor((start - firstDayStart) / DAY_MS);
              const endDayIndex = Math.floor((end - firstDayStart) / DAY_MS);

              for (let i = dayIndex; i <= endDayIndex; i++) {
                if (i >= 0 && i < dayKeys.length) {
                  const { start: dayStart, end: dayEnd } = dayRanges[i];
                  const key = dayKeys[i];
                  const fixedStart = Math.max(start, dayStart);
                  const fixedEnd = Math.min(end, dayEnd);
                  const timeSpent = fixedEnd - fixedStart;

                  const dayBreakdown = dailyEntriesBreakdownMap.get(key);
                  dayBreakdown.ungroupedEntries.push(entry);
                  dayBreakdown.timeSpent += timeSpent;
                  if (!dayBreakdown.usersMap.has(userId)) {
                    dayBreakdown.usersCount++;
                    dayBreakdown.usersMap.set(userId, {
                      timeSpent: 0,
                      entriesCount: 0,
                      entries: [],
                    });
                  }
                  const userDayBreakdown = dayBreakdown.usersMap.get(userId);
                  userDayBreakdown.timeSpent += timeSpent;
                  userDayBreakdown.entriesCount++;
                  userDayBreakdown.entries.push(entry);
                }
              }
            }
          }
        }
      }

      return { dailyEntriesBreakdownMap };
    },
    []
  );

  const [dailyEntriesBreakdownMap, setDailyEntriesBreakdownMap] =
    useState(null);

  useEffect(() => {
    const { dailyEntriesBreakdownMap: newDailyEntriesBreakdownMap } =
      computeEntriesMap(filteredReadingHistory, dayRangesMap);
    setDailyEntriesBreakdownMap(newDailyEntriesBreakdownMap);
  }, [filteredReadingHistory, dayRangesMap]);

  const itemsColorMap = useMemo(() => {
    const colorMap = new Map();

    if (!dailyEntriesBreakdownMap) return colorMap;

    let shouldReassign = false;
    const fullColorTime = filteredReadingHistoryCount * 3600000;
    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > now.getDay()) break;

        const key = `${week}-${day}`;

        const range = dayRangesMap.get(key);

        const entries = dailyEntriesBreakdownMap?.get?.(key)?.ungroupedEntries;
        if (entries) {
          const prevColor = prevItemsColorMapRef.current.get(key);
          const color = BibleVizUtils.Functions.GetHistoryColorByRange({
            step,
            stepColors,
            reading: entries,
            range,
            fullColorTime,
          });
          if (!shouldReassign && (!prevColor || prevColor !== color))
            shouldReassign = true;
          colorMap.set(key, color);
        } else {
          throw new Error(`Entries not found for ${key}`);
        }
      }
    }

    if (shouldReassign) {
      prevItemsColorMapRef.current = colorMap;
      return colorMap;
    }

    return prevItemsColorMapRef.current;
  }, [startOfWeekAYearAgo, tick, dailyEntriesBreakdownMap]);

  const items = useMemo(() => {
    const items = [];
    const monthsSet = new Set();
    const monthLabelGridRow = `1 / 2`;
    const dayLabelGridColumn = `1 / 2`;
    const MS_PER_MINUTE = 1000 * 60;
    const MS_PER_HOUR = MS_PER_MINUTE * 60;

    items.push(
      <Label gridRow={`3 / 4`} gridColumn={dayLabelGridColumn} isDay={true}>
        {`Mon `}
      </Label>,
      <Label gridRow={`5 / 6`} gridColumn={dayLabelGridColumn} isDay={true}>
        {`Wed `}
      </Label>,
      <Label gridRow={`7 / 8`} gridColumn={dayLabelGridColumn} isDay={true}>
        {`Fri `}
      </Label>
    );

    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > now.getDay()) break;

        const key = `${week}-${day}`;
        const dayDate = new Date(startOfWeekAYearAgo);
        dayDate.setDate(dayDate.getDate() + week * 7 + day);
        const time = dayDate.getTime();
        const range = dayRangesMap.get(key);
        const isToday = week === weeksCount - 1 && day === now.getDay();
        const dayBreakdown = dailyEntriesBreakdownMap?.get?.(key);

        const {
          weekday,
          day: dayOfTheMonth,
          month,
          monthName,
          year,
        } = GetPastDateInfo(time);
        const timeSpent = dayBreakdown?.timeSpent ?? 0;
        const isTimeSpentNoticeable = timeSpent > MS_PER_MINUTE;
        const tooltipContent = [
          isToday
            ? "Today"
            : `${weekday} ${monthName} ${dayOfTheMonth}, ${year}`,
        ];
        if (isTimeSpentNoticeable) {
          const sortedUserActivity = Array.from(dayBreakdown.usersMap.entries())
            .map(([userId, acivity]) => {
              return { userId, ...acivity };
            })
            .sort((activityA, activityB) => {
              return activityB.timeSpent - activityA.timeSpent;
            });
          const topUserActivity = sortedUserActivity.slice(0, 3);
          const extraUserActivity = sortedUserActivity.slice(3);

          for (const userActivity of topUserActivity) {
            const { timeSpent: userTimeSpent, userId } = userActivity;
            let fixedContent;
            if (userTimeSpent > MS_PER_HOUR) {
              const hoursCount = Math.floor(userTimeSpent / MS_PER_HOUR);
              fixedContent = `spent ${hoursCount} hour${hoursCount > 1 ? "s" : ""}`;
            } else {
              const minutesCount = Math.max(
                1,
                Math.floor(userTimeSpent / MS_PER_MINUTE)
              );
              fixedContent = `spent ${minutesCount} minute${minutesCount > 1 ? "s" : ""}`;
            }
            tooltipContent.push(
              <ReadingHistoryTooltipContent
                userId={userId}
                fixedContent={fixedContent}
              />
            );
          }
          if (extraUserActivity.length > 0) {
            const extraTimeSpent = Math.max(
              extraUserActivity.reduce((curr, { timeSpent: userTimeSpent }) => {
                return curr + userTimeSpent;
              }, 0),
              1
            );
            let extraActivityContent;
            if (extraTimeSpent > MS_PER_HOUR) {
              const hoursCount = Math.floor(extraTimeSpent / MS_PER_HOUR);
              extraActivityContent = `+${extraUserActivity.length} spent ${hoursCount} hour${hoursCount > 1 ? "s" : ""}`;
            } else {
              const minutesCount = Math.max(
                1,
                Math.floor(extraTimeSpent / MS_PER_MINUTE)
              );
              extraActivityContent = `+${extraUserActivity.length} spent ${minutesCount} minute${minutesCount > 1 ? "s" : ""}`;
            }
            tooltipContent.push(extraActivityContent);
          }
        }
        const backgroundColor = itemsColorMap?.get?.(key) ?? stepColors[0];

        const itemGridRow = `${day + 2} / ${day + 3}`;
        const itemGridColumn = `${week + 2} / ${week + 3}`;

        if (!monthsSet.has(month)) {
          monthsSet.add(month);
          const monthLabelGridColumn = `${week + 2} / ${week + 4}`;
          const fixedName =
            BibleVizUtils.Functions.CapitalizeFirstLetter(monthName);
          items.push(
            <Label
              gridRow={monthLabelGridRow}
              gridColumn={monthLabelGridColumn}
              isDay={false}
            >
              {fixedName}
            </Label>
          );
        }

        items.push(
          <Item
            id={key}
            key={key}
            backgroundColor={backgroundColor}
            gridRow={itemGridRow}
            gridColumn={itemGridColumn}
            tooltipContent={tooltipContent}
            range={range}
            handleItemClick={handleItemClick}
            readingHistoryRange={readingHistoryRange}
          />
        );
      }
    }

    return items;
  }, [
    startOfWeekAYearAgo,
    now,
    itemsColorMap,
    readingHistoryRange,
    dailyEntriesBreakdownMap,
  ]);

  useEffect(() => {
    const lastKey = Array.from(dayRangesMap.keys()).pop();
    const element = document.getElementById(lastKey);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth", // smooth scrolling animation
        block: "center", // scroll so it's centered in the viewport
      });
    }
  }, []);

  return (
    <div className="readingHistoryTimelineContainer">
      <div className="readingHistoryTimeline">{items}</div>
    </div>
  );
};

function GetPastDateInfo(time) {
  const date = new Date(time);

  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthName = date.toLocaleString("en-US", { month: "short" });

  return { weekday, day, month, monthName, year };
}

function GetDayRange(timestamp) {
  const date = new Date(timestamp);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}
