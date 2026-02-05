import {
  Tooltip,
  ReadingHistoryTooltipContent,
} from "scriptureMap2D.main.Tooltip";
import { useTimeContext } from "scriptureMap2D.main.TimeContext";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

import { useSideBarContext } from "app.hooks.sideBar";
import { readingHistoryColorStore } from "bibleVizUtils.services.ReadingHistoryColorStore";

const { useState, useCallback, useMemo, useEffect, useRef } = os.appHooks;
const { memo } = os.appCompat;

const step = 0.25;

const ReadingHistoryTooltipHeader = memo(
  ({ monthName, dayOfTheMonth, year, minutesCount }) => {
    const { t } = useSideBarContext();
    const showMinutesCount = useMemo(() => {
      return minutesCount > 0;
    }, [minutesCount]);

    return (
      <>
        <span
          className={"tooltip-reading-history-title"}
        >{`${monthName} ${dayOfTheMonth}, ${year}`}</span>
        {showMinutesCount ? (
          <>
            <span
              className={"tooltip-reading-history-count"}
            >{`${minutesCount} Minutes of reading`}</span>
            <span className={"horizontal-divider"}></span>
          </>
        ) : null}
      </>
    );
  }
);

const Label = memo(({ gridRow, gridColumn, children, isDay }) => {
  const style = useMemo(() => {
    return { gridRow, gridColumn };
  }, [gridRow, gridColumn]);

  return (
    <div
      style={style}
      className={`reading-history-timeline-label reading-history-timeline-label-${isDay ? "day" : "month"}`}
    >
      {children}
    </div>
  );
});

const Item = memo(
  ({
    style,
    tooltipContent,
    handleItemClick,
    range,
    readingHistoryRangeSeconds,
    id,
    isUpcoming,
  }) => {
    const selected = useMemo(() => {
      return range === readingHistoryRangeSeconds;
    }, [range, readingHistoryRangeSeconds]);

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
        onPointerLeave={() => {
          setContainerRect(null);
        }}
        style={style}
        className={`reading-history-timeline-item${selected ? " selected" : ""}${isUpcoming ? " upcoming" : ""}`}
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

  const timelineRef = useRef(null);

  const { tick } = useTimeContext();

  const prevItemsColorMapRef = useRef(new Map());

  const handleItemClick = useCallback(
    (range) => {
      handleReadingHistoryRangeSelectorClick(range);
    },
    [handleReadingHistoryRangeSelectorClick]
  );

  const itemsColorMap = useMemo(() => {
    const colorMap = new Map();
    const yearlySummaryUsersCount = Object.keys(
      yearlyReadingHistorySummary.users
    ).length;

    if (!dailyReadingHistorySummaries) return colorMap;

    let shouldReassign = false;
    const fullColorTimeSeconds = yearlySummaryUsersCount * SEC_PER_HOUR; // 1 hour per selected user
    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > timelineRange.endDate.getDay())
          break;

        const key = `${week}-${day}`;

        const summary = dailyReadingHistorySummaries?.get?.(key);
        let color;
        const prevColor = prevItemsColorMapRef.current.get(key);

        if (summary && summary.totalTimeSpentReading > SEC_PER_MINUTE) {
          const usersKeys = Object.keys(summary.users);
          const colorData = {
            baseColor: themeColors?.["1"]?.firstToolbarbutton ?? "#dfdede", // Hardcoded firstToolbarbutton. Must be accesible in the future
            step,
            readingTimeSeconds: summary.totalTimeSpentReading,
            fullColorTimeSeconds,
          };
          if (usersKeys.length > 1) {
            colorData.userColor =
              themeColors?.["1"]?.secondaryColor ?? "#D2691E"; // Hardcoded primary color. Must be accesible in the future
          } else {
            const userKey = usersKeys[0];
            colorData.userColor =
              readingHistoryColorStore.getUserColor(userKey);
          }
          color =
            BibleVizUtils.Functions.GetHistoryColorByReadingTime(colorData);
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

  const items = useMemo(() => {
    const items = [];
    const monthsSet = new Set();
    const monthLabelGridRow = `1 / 2`;
    const dayLabelGridColumn = `1 / 2`;
    const todayDate = new Date();

    items.push(
      <Label gridRow={`3 / 4`} gridColumn={dayLabelGridColumn} isDay={true}>
        {t("monShort")}
      </Label>,
      <Label gridRow={`5 / 6`} gridColumn={dayLabelGridColumn} isDay={true}>
        {t("wedShort")}
      </Label>,
      <Label gridRow={`7 / 8`} gridColumn={dayLabelGridColumn} isDay={true}>
        {t("friShort")}
      </Label>
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
        const fixedName = BibleVizUtils.Functions.CapitalizeFirstLetter(
          labelDateInfo.monthName
        );

        items.push(
          <Label
            key={`label-${uniqueMonthKey}`}
            gridRow={monthLabelGridRow}
            gridColumn={monthLabelGridColumn}
            isDay={false}
          >
            {fixedName}
          </Label>
        );
      }

      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > timelineRange.endDate.getDay())
          break;

        const key = `${week}-${day}`;
        const dayDate = new Date(startDateStartOfWeek);
        dayDate.setDate(dayDate.getDate() + week * 7 + day);
        const time = dayDate.getTime();
        const range = dayRangesMap.get(key);
        const daySummary = dailyReadingHistorySummaries?.get?.(key);

        const { day: dayOfTheMonth, monthName, year } = GetPastDateInfo(time);

        const timeSpent = daySummary?.totalTimeSpentReading ?? 0;
        const isTimeSpentNoticeable = timeSpent > SEC_PER_MINUTE; // more than 1 minute
        const timeSpentMinutes = Math.floor(timeSpent / SEC_PER_MINUTE);

        const tooltipContent = [
          <ReadingHistoryTooltipHeader
            monthName={monthName}
            dayOfTheMonth={dayOfTheMonth}
            year={year}
            minutesCount={timeSpentMinutes}
          />,
        ];

        if (isTimeSpentNoticeable) {
          const userTimes = [];
          for (const userId in daySummary.users) {
            const userTimeSpentSeconds =
              daySummary.users[userId].totalTimeSpentReading;
            userTimes.push([userId, userTimeSpentSeconds]);
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
            const { totalTimeSpentReading: userTimeSpentSeconds } = userSummary;
            const minutesCount = Math.max(
              1,
              Math.floor(userTimeSpentSeconds / SEC_PER_MINUTE)
            );
            const fixedContent = `(${minutesCount} Min)`;
            tooltipContent.push(
              <ReadingHistoryTooltipContent
                userId={userId}
                fixedContent={fixedContent}
              />
            );
          }
          if (extraUsers.length > 0) {
            const extraTimeSpentSeconds = Math.max(
              extraUsers.reduce((curr, userId) => {
                const userTimeSpentSeconds =
                  daySummary.users[userId].totalTimeSpentReading;
                return curr + userTimeSpentSeconds;
              }, 0),
              1
            );
            let extraActivityContent;
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
            tooltipContent.push(extraActivityContent);
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

        items.push(
          <Item
            id={key}
            key={`${week}-${day}-${dayOfTheMonth}-${monthName}-${year}`}
            tooltipContent={tooltipContent}
            range={range}
            handleItemClick={handleItemClick}
            readingHistoryRangeSeconds={readingHistoryRangeSeconds}
            style={style}
            isUpcoming={isUpcoming}
          />
        );
      }
    }

    return items;
  }, [itemsColorMap, readingHistoryRangeSeconds, dailyReadingHistorySummaries]);

  useEffect(() => {
    const lastKey = Array.from(dayRangesMap.keys()).pop();
    const element = document.getElementById(lastKey);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth", // smooth scrolling animation
        block: "center", // scroll so it's centered in the viewport
      });
    }

    const el = timelineRef.current;

    if (!el) return;

    const handleWheel = (e) => {
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

  return (
    <div className="reading-history-timeline-container">
      <div ref={timelineRef} className="reading-history-timeline">
        {items}
      </div>
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
