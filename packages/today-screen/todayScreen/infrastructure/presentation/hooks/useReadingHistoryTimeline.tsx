import type {
  ReadingHistoryContentData,
  ReadingHistoryTimelineFooterData,
} from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/seedBible";
import type {
  ReadingEventsByDay,
  DailyReadingHistorySummaries,
  DateRange,
  KeyRangesMap,
  TimelineRangesMap,
} from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useTimeContext } from "todayScreen.infrastructure.presentation.contexts.time.TimeContext";
import {
  flat,
  calculateReadingHistorySummary,
} from "seed-bible.managers.ReadingHistoryManager";
import type { ReadingHistorySummary } from "seed-bible.managers.ReadingHistoryManager";
import { useTodayContext } from "../contexts/today/TodayContext";
import { useSocialSectionContext } from "../contexts/socialSection/SocialSectionContext";
import type { TooltipContentData } from "@packages/today-screen/todayScreen/domain/models/tooltip";

type ItemsColorMap = Map<string, React.CSSProperties["color"]>;

type UseReadingHistoryTimeline = () => {
  itemsData: ReadingHistoryContentData[];
  timelineRef: { current: HTMLDivElement | null };
  footer: ReadingHistoryTimelineFooterData;
};

const { useState, useMemo, useEffect, useRef } = os.appHooks;

const timelineMinYear = 2023;
const step = 0.25;

// const initialTimelineYear = new Date().getFullYear();

export const useReadingHistoryTimeline: UseReadingHistoryTimeline = () => {
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const {
    getDayRangeSeconds,
    getReadingHistoryEvents,
    translate,
    GetPastDateInfo,
    language,
    CapitalizeFirstLetter,
    theme,
    readingHistoryService,
  } = useTodayContext();
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
    SEC_PER_DAY,
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
        const { start, end } = getDayRangeSeconds(dayDate.getTime());
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

    let summary;
    // const rangedEventsByBook: RangedReadingEventsByBook = new Map();
    const eventsByDay: ReadingEventsByDay = new Map();
    const dailySummaries: DailyReadingHistorySummaries = new Map();

    if (selectedUsers.length === 0) {
      summary = calculateReadingHistorySummary([]);
      setYearlyReadingHistorySummary(summary);
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

    const yieldToMain = () =>
      new Promise<void>((resolve) => setTimeout(resolve, 0));

    Promise.all(allEventPromises)
      .then(async (allEvents) => {
        if (!isMounted) return;
        const flattenedEvents = Array.from(flat(allEvents));

        for (const event of flattenedEvents) {
          const { start, end } = event;
          const duration = end - start;
          if (duration < SEC_PER_MINUTE) continue;

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
  }, [tick, userFilters, timespan, timelineRange, startDateStartOfWeek]);

  const prevItemsColorMapRef = useRef<ItemsColorMap>(new Map());

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
          const colorData = {
            baseColor:
              theme.variables.readerToolbarFloatingButtonBackground ??
              "#dfdede",
            step,
            readingTimeSeconds: summary.totalTimeSpentReading,
            fullColorTimeSeconds,
            userColor: theme.variables.secondaryColor,
          };
          color = readingHistoryService.getColorByReadingTime(colorData);
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
  }, [tick, dailyReadingHistorySummaries, yearlyReadingHistorySummary, theme]);

  const itemsData = useMemo<ReadingHistoryContentData[]>(() => {
    const monthsSet = new Set();
    const monthLabelGridRow = `1 / 2`;
    const dayLabelGridColumn = `1 / 2`;
    const todayDate = new Date();

    const translatedMonday = translate("monday-short");
    const translatedWednesday = translate("wednesday-short");
    const translatedFriday = translate("friday-short");

    const items: ReadingHistoryContentData[] = [
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

        const tooltipContentData: TooltipContentData = {
          type: "text",
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
      yearSelectorLabelTextContent: translate("selected-year", { year }),
      yearSelectorOptionsData,
    };
  }, [yearTimespanMap, year, selectYear, translate]);

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

  return { itemsData, timelineRef, footer };
};
