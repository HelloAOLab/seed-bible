import type {
  ReadingHistoryContentData,
  ReadingHistoryTimelineFooterData,
} from "../ReadingHistoryTimeline/ReadingHistoryTimeline";
import type { ReadonlySignal } from "@preact/signals";
import { useTimeContext } from "./TimeContext";
import { useI18n } from "../../i18n";
import { useHorizontalScroll } from "../useHorizontalScroll";
import { ColorParser } from "../../managers/Colors";
import {
  GetDayRangeSeconds,
  GetPastDateInfo,
  type Range,
} from "../../managers/ReadingHistoryTime";
import { CapitalizeFirstLetter } from "../../managers/Strings";
import { getColorByReadingTime } from "../../managers/ReadingHistoryColors";
import { loadDailyReadingHistory } from "../../managers/ReadingHistoryManager";
import type {
  DailyReadingHistorySummaries,
  ReadingHistorySummary,
} from "../../managers/ReadingHistoryManager";
import { useSocialSectionContext } from "./SocialSectionContext";
import type { BibleTheme } from "../../managers/ThemeManager";
import type { TodayManager } from "../../managers/TodayManager";

/**
 * What Today puts in a timeline day's tooltip. Only the formatted date, so
 * the shared `Tooltip` shell renders it as plain text; Scripture Map fills the
 * same slot with a richer union of its own.
 */
export type TimelineTooltipContent = {
  content: string;
};

/** An inclusive date window. */
type DateRange = {
  startDate: Date;
  endDate: Date;
};

/** Maps a day key to its second-based time range. */
type KeyRangesMap = Map<string, Range>;

/** Maps a timeline year to the date window it covers. */
type TimelineRangesMap = Map<number, DateRange>;

type ItemsColorMap = Map<string, React.CSSProperties["color"]>;

type UseReadingHistoryTimeline = (props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
}) => {
  itemsData: ReadingHistoryContentData<TimelineTooltipContent>[];
  timelineRef: { current: HTMLDivElement | null };
  footer: ReadingHistoryTimelineFooterData;
};

import { useState, useMemo, useEffect, useRef } from "preact/hooks";

const timelineMinYear = 2023;
const step = 0.25;

// const initialTimelineYear = new Date().getFullYear();

export const useReadingHistoryTimeline: UseReadingHistoryTimeline = ({
  today,
  theme,
}) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const { getReadingHistoryEvents } = today;
  const { t, language } = useI18n();
  const { selectYear, selectDay, year, timespan, userFilters } =
    useSocialSectionContext();

  const { tick } = useTimeContext();

  const yearTimespanMap = useMemo<TimelineRangesMap>(() => {
    const timespanMap = new Map<number, DateRange>();

    const nowDate = new Date();
    const endOfToday = new Date(nowDate);
    endOfToday.setHours(23, 59, 59, 999);

    for (let year = nowDate.getFullYear(); year > timelineMinYear; year--) {
      const startDate = new Date(nowDate);
      const endDate = new Date(nowDate);
      endDate.setFullYear(year);
      endDate.setHours(23, 59, 59, 999);

      startDate.setFullYear(year - 1);
      startDate.setHours(0, 0, 0, 0);
      if (startDate && endDate) {
        timespanMap.set(year, {
          startDate,
          endDate,
        });
      }
    }

    return timespanMap;
  }, []);

  const timelineRange = useMemo<DateRange>(() => {
    let range = yearTimespanMap.get(year);
    if (!range) {
      const now = new Date();
      range = {
        startDate: now,
        endDate: now,
      };
    }
    return range;
  }, [yearTimespanMap, year]);

  const [yearlyReadingHistorySummary, setYearlyReadingHistorySummary] =
    useState<ReadingHistorySummary | null>(null);
  const [dailyReadingHistorySummaries, setDailyReadingHistorySummaries] =
    useState<DailyReadingHistorySummaries | null>(null);

  const {
    startDateStartOfWeek,
    weeksCount,
    SEC_PER_MINUTE,
    SEC_PER_HOUR,
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
    // const MS_PER_MINUTE = MS_PER_SECOND * SEC_PER_MINUTE;
    // const MS_PER_HOUR = MS_PER_SECOND * SEC_PER_HOUR;
    // const MS_PER_DAY = MS_PER_SECOND * SEC_PER_DAY;
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
      // endDateStartOfWeek,
      weeksCount,
      // MS_PER_SECOND,
      // MS_PER_MINUTE,
      // MS_PER_HOUR,
      // MS_PER_DAY,
      // MS_PER_WEEK,
      SEC_PER_MINUTE,
      SEC_PER_HOUR,
      SEC_PER_DAY,
      SEC_PER_WEEK,
      dayRangesMap,
    };
  }, [timelineRange]);

  useEffect(() => {
    let isMounted = true;
    const selectedUsers = [];

    for (const [userId, selected] of userFilters) {
      if (selected) {
        selectedUsers.push(userId);
      }
    }

    const startDateStartOfWeekSeconds = startDateStartOfWeek.getTime() / 1000;
    const endSeconds = timelineRange.endDate.getTime() / 1000;

    loadDailyReadingHistory({
      fetchEvents: getReadingHistoryEvents,
      readerIds: selectedUsers,
      dayKeys: Array.from(dayRangesMap.keys()),
      startSeconds: startDateStartOfWeekSeconds,
      endSeconds,
      minDurationSeconds: SEC_PER_MINUTE,
    })
      .then(({ summariesByDay, total }) => {
        if (!isMounted) return;
        setYearlyReadingHistorySummary(total);
        setDailyReadingHistorySummaries(summariesByDay);
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
  }, [tick, userFilters, timespan, timelineRange, startDateStartOfWeek]);

  const prevItemsColorMapRef = useRef<ItemsColorMap>(new Map());

  // Unwrapped here in the render body, never inside the memo below. `useMemo` is
  // not a reactive scope, so a `theme.value` read in there would neither
  // subscribe this component to a theme change nor invalidate the memo — the
  // signal's own identity never changes, only the value it holds. Reading it out
  // here is what makes a theme switch recolour the timeline immediately.
  const currentTheme = theme.value;

  const itemsColorMap = useMemo<ItemsColorMap>(() => {
    const colorMap: ItemsColorMap = new Map();
    if (!dailyReadingHistorySummaries || !yearlyReadingHistorySummary)
      return colorMap;

    const yearlySummaryUsersCount = Object.keys(
      yearlyReadingHistorySummary.users
    ).length;

    let shouldReassign = false;
    const fullColorTimeSeconds = yearlySummaryUsersCount * SEC_PER_HOUR; // 1 hour per selected user

    const backgroundRgb = ColorParser(
      currentTheme.variables.readerBackground ?? "#FFFFFF",
      "arrayRGB"
    );
    const baseColor = currentTheme.variables.dividerColor
      ? ColorParser(
          currentTheme.variables.dividerColor,
          "longHex",
          backgroundRgb
        )
      : "#dfdede";
    const userColor = currentTheme.variables.primaryColor
      ? ColorParser(
          currentTheme.variables.primaryColor,
          "longHex",
          backgroundRgb
        )
      : "#D2691E";

    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === weeksCount - 1 && day > timelineRange.endDate.getDay())
          break;

        const key = `${week}-${day}`;

        const summary = dailyReadingHistorySummaries.get(key);
        let color: React.CSSProperties["color"] | undefined;
        const prevColor = prevItemsColorMapRef.current.get(key);

        if (summary && summary.totalTimeSpentReading > SEC_PER_MINUTE) {
          color = getColorByReadingTime({
            baseColor,
            step,
            readingTimeSeconds: summary.totalTimeSpentReading,
            fullColorTimeSeconds,
            userColor,
          });
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
    currentTheme,
  ]);

  const itemsData = useMemo<
    ReadingHistoryContentData<TimelineTooltipContent>[]
  >(() => {
    const monthsSet = new Set();
    const monthLabelGridRow = `1 / 2`;
    const dayLabelGridColumn = `1 / 2`;
    const todayDate = new Date();

    const translatedMonday = t("monday-short", { defaultValue: "Mon" });
    const translatedWednesday = t("wednesday-short", { defaultValue: "Wed" });
    const translatedFriday = t("friday-short", { defaultValue: "Fri" });

    const items: ReadingHistoryContentData<TimelineTooltipContent>[] = [
      {
        type: "label",
        key: translatedMonday,
        gridRow: "3 / 4",
        gridColumn: dayLabelGridColumn,
        isDay: true,
        children: translatedMonday,
      },
      {
        type: "label",
        key: translatedWednesday,
        gridRow: "5 / 6",
        gridColumn: dayLabelGridColumn,
        isDay: true,
        children: translatedWednesday,
      },
      {
        type: "label",
        key: translatedFriday,
        gridRow: "7 / 8",
        gridColumn: dayLabelGridColumn,
        isDay: true,
        children: translatedFriday,
      },
    ];

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

          items.push({
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

        const itemGridRow = `${day + 2} / ${day + 3}`;
        const itemGridColumn = `${week + 2} / ${week + 3}`;
        const style = {
          gridRow: itemGridRow,
          gridColumn: itemGridColumn,
          background: itemsColorMap?.get?.(key),
        };
        const isUpcoming = time > todayDate.getTime();

        const formattedDate = new Intl.DateTimeFormat(language, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(time);

        const tooltipContentData: TimelineTooltipContent = {
          content: formattedDate,
        };

        if (range) {
          items.push({
            type: "item",
            id: key,
            key: `${week}-${day}-${dayOfTheMonth}-${monthName}-${year}`,
            tooltipContentsData: [tooltipContentData],
            range,
            handleItemClick: (clickedRange) => {
              selectDay(
                clickedRange
                  ? { from: clickedRange.start, to: clickedRange.end }
                  : undefined
              );
            },
            readingHistoryRangeSeconds: {
              start: timespan?.from ?? 0,
              end: timespan?.to ?? 0,
            },
            style: style,
            isUpcoming,
          });
        }
      }
    }

    return items;
  }, [weeksCount, dayRangesMap, selectDay, itemsColorMap, timespan]);

  // The year selector sets the timeline year (and clears the timespan via
  // selectYear). Legend is currently placeholder data.
  const footer = useMemo<ReadingHistoryTimelineFooterData>(() => {
    const yearSelectorOptionsData = [...yearTimespanMap.keys()].map(
      (selectableYear) => ({
        key: selectableYear,
        className: `year-selector-option${selectableYear === year ? " selected" : ""}`,
        onClick: () => {
          selectYear(selectableYear);
        },
        content: selectableYear,
      })
    );

    const legendSquaresData = Array.from({ length: 5 }, (_, index) => ({
      key: index,
      style: {
        backgroundColor: `color-mix(in srgb, var(--sb-primary-color) ${(index + 1) * 20}%, var(--sb-divider-color))`,
      },
    }));

    return {
      legendSquaresData,
      lessText: "Less",
      moreText: "More",
      yearSelectorLabelTextContent: t("selected-year", {
        year,
        defaultValue: "Year: {{year}}",
      }),
      yearSelectorOptionsData,
    };
  }, [yearTimespanMap, year, selectYear, t]);

  // Wheel → horizontal scroll is shared via the injected hook.
  useHorizontalScroll(timelineRef);

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
  }, []);

  return { itemsData, timelineRef, footer };
};
