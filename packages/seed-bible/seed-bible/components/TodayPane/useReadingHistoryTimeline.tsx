import type {
  ReadingHistoryContentData,
  ReadingHistoryTimelineFooterData,
} from "../ReadingHistoryTimeline/ReadingHistoryTimeline";
import { useSignal, type ReadonlySignal } from "@preact/signals";
import { useMemo, useEffect, useRef } from "preact/hooks";
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

/**
 * The earliest year the year selector offers.
 *
 * Hardcoded because nothing can currently derive it: there is no query for
 * "the year of this reader's first event", so the timeline has no way to know
 * when a given history actually begins. The consequence is that a reader with
 * events older than this cannot reach them from here.
 */
const TIMELINE_EARLIEST_YEAR = 2024;

/**
 * Quantises a day's colour into `1 / step` bands between the base colour and
 * full colour, so days with similar reading times share a shade instead of
 * each getting a marginally different one.
 */
const step = 0.25;

const SEC_PER_MINUTE = 60;
const SEC_PER_HOUR = SEC_PER_MINUTE * 60;
const SEC_PER_DAY = SEC_PER_HOUR * 24;
const SEC_PER_WEEK = SEC_PER_DAY * 7;
const MS_PER_WEEK = SEC_PER_WEEK * 1000;

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

    for (
      let year = nowDate.getFullYear();
      year >= TIMELINE_EARLIEST_YEAR;
      year--
    ) {
      const startDate = new Date(nowDate);
      const endDate = new Date(nowDate);
      endDate.setFullYear(year);
      endDate.setHours(23, 59, 59, 999);

      startDate.setFullYear(year - 1);
      startDate.setHours(0, 0, 0, 0);
      timespanMap.set(year, { startDate, endDate });
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

  const yearlySummarySignal = useSignal<ReadingHistorySummary | null>(null);
  const dailySummariesSignal = useSignal<DailyReadingHistorySummaries | null>(
    null
  );

  const { startDateStartOfWeek, weeksCount, dayRangesMap } = useMemo(() => {
    const getStartOfWeek = (date: Date) => {
      const tempDate = new Date(date);
      tempDate.setDate(tempDate.getDate() - tempDate.getDay());
      tempDate.setHours(0, 0, 0, 0);
      return tempDate;
    };

    const startDateStartOfWeek = getStartOfWeek(timelineRange.startDate);
    const endDateStartOfWeek = getStartOfWeek(timelineRange.endDate);

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

    return { startDateStartOfWeek, weeksCount, dayRangesMap };
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
        yearlySummarySignal.value = total;
        dailySummariesSignal.value = summariesByDay;
      })
      .catch((error) => {
        console.warn(
          `[useReadingHistoryTimeline] error fetching reading events`,
          error
        );
      });
    return () => {
      isMounted = false;
    };
  }, [tick, userFilters, timespan, timelineRange, startDateStartOfWeek]);

  const prevItemsColorMapRef = useRef<ItemsColorMap>(new Map());

  // All three unwrapped here in the render body, never inside the memo below.
  // `useMemo` is not a reactive scope, so a `.value` read in there would neither
  // subscribe this component to a change nor invalidate the memo — a signal's
  // own identity never changes, only the value it holds. Reading them out here
  // is what makes a theme switch recolour the timeline immediately, and what
  // lets the fetched summaries reach the memo's dependency list at all.
  const currentTheme = theme.value;
  const dailyReadingHistorySummaries = dailySummariesSignal.value;
  const yearlyReadingHistorySummary = yearlySummarySignal.value;

  // Resolved once and shared by the day cells and the legend below, so the two
  // cannot describe different scales. Keyed on the theme because `ColorParser`
  // composites against the reader background, which the theme owns.
  const { baseColor, userColor } = useMemo(() => {
    const backgroundRgb = ColorParser(
      currentTheme.variables.readerBackground ?? "#FFFFFF",
      "arrayRGB"
    );
    return {
      baseColor: currentTheme.variables.dividerColor
        ? ColorParser(
            currentTheme.variables.dividerColor,
            "longHex",
            backgroundRgb
          )
        : "#dfdede",
      userColor: currentTheme.variables.primaryColor
        ? ColorParser(
            currentTheme.variables.primaryColor,
            "longHex",
            backgroundRgb
          )
        : "#D2691E",
    };
  }, [currentTheme]);

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
    baseColor,
    userColor,
    weeksCount,
    timelineRange,
  ]);

  const itemsData = useMemo<
    ReadingHistoryContentData<TimelineTooltipContent>[]
  >(() => {
    const monthsSet = new Set();
    const monthLabelGridRow = `1 / 2`;
    const dayLabelGridColumn = `1 / 2`;
    const todayDate = new Date();

    // Weekday labels come from `Intl`, not translation keys. A bare "Mon" or
    // "Wed" is too ambiguous to hand to a translator -- "Wed" was read as the
    // verb and came back as "Heiraten" / "Casarse" / "Épouser" -- and `Intl`
    // already returns a properly abbreviated name per locale, which is what
    // the single-column label needs. Months on this grid resolve the same way.
    // The dates below are only a known Monday, Wednesday and Friday.
    const weekdayFormatter = new Intl.DateTimeFormat(language, {
      weekday: "short",
    });
    const translatedMonday = weekdayFormatter.format(new Date(2024, 0, 1));
    const translatedWednesday = weekdayFormatter.format(new Date(2024, 0, 3));
    const translatedFriday = weekdayFormatter.format(new Date(2024, 0, 5));

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
    // `language` and `t` are load-bearing: every month label and every tooltip
    // date is formatted through them, so omitting them left the grid stuck in
    // whichever language it first rendered in. There is no `exhaustive-deps`
    // rule configured in this repo, so this list is maintained by hand.
  }, [
    weeksCount,
    dayRangesMap,
    startDateStartOfWeek,
    timelineRange,
    selectDay,
    itemsColorMap,
    timespan,
    language,
    t,
  ]);

  // The year selector sets the timeline year (and clears the timespan via
  // selectYear).
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

    // One swatch for an untouched day, then one per quantisation band, each
    // painted by the same function as the cells. Generated from `step` rather
    // than restating it, so the legend cannot describe a scale the grid does
    // not use -- it previously showed even 20/40/60/80/100% mixes while the
    // cells landed on 25/50/75/100% over a base, and its lightest swatch was
    // already tinted where an unread day is plain.
    const legendSquaresData = [
      { key: 0, style: { backgroundColor: baseColor } },
      ...Array.from({ length: Math.round(1 / step) }, (_, index) => ({
        key: index + 1,
        style: {
          backgroundColor: getColorByReadingTime({
            baseColor,
            userColor,
            step,
            // A ratio expressed as "seconds out of one second": the function
            // only ever uses the quotient, and this asks it for the exact
            // band boundary rather than reimplementing the interpolation.
            readingTimeSeconds: (index + 1) * step,
            fullColorTimeSeconds: 1,
          }),
        },
      })),
    ];

    return {
      legendSquaresData,
      lessText: t("less", { defaultValue: "Less" }),
      moreText: t("more", { defaultValue: "More" }),
      yearSelectorLabelTextContent: t("selected-year", {
        year,
        defaultValue: "Year: {{year}}",
      }),
      yearSelectorOptionsData,
    };
    // `language` for the same reason as `itemsData` above: all three strings
    // here are resolved through `t`, so without it the legend and the year
    // label keep whichever language they first rendered in. `baseColor` and
    // `userColor` because the legend now resolves real theme colours instead of
    // deferring to CSS variables, which used to follow a theme switch on their
    // own.
  }, [yearTimespanMap, year, selectYear, t, language, baseColor, userColor]);

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
