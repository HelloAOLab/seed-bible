import { useSignal, useComputed } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import {
  useEffect,
  type MutableRef,
  useRef,
  useMemo,
  useCallback,
} from "preact/hooks";
import type { TodayManager } from "../../managers/TodayManager";
import {
  useSocialSectionContext,
  type SocialSectionUserProfile,
} from "./SocialSectionContext";
import { useClickOutside } from "./useClickOutside";
import { useI18n } from "../../i18n";
import { useHorizontalScroll } from "../useHorizontalScroll";
import type {
  TimespanFilterOptionData,
  TimespanOptionId,
} from "./readingHistory";

type UseHistoryCard = (today: TodayManager) => {
  userFilterOpen: ReadonlySignal<boolean>;
  userFilterIcon: ReadonlySignal<string>;
  handleUserFilterClick: (e: MouseEvent) => void;
  optionsRef: MutableRef<HTMLDivElement | null>;
  optionsContainerRef: MutableRef<HTMLDivElement | null>;
  userFilters: Map<string, boolean>;
  userProfileMap: Map<string, SocialSectionUserProfile>;
  handleFilterOptionClick: (e: MouseEvent, id: string) => void;
  userFilterText: string;
  timespanFilterOptionsData: ReadonlySignal<TimespanFilterOptionData[]>;
  selectedTimespanOptionId: ReadonlySignal<TimespanOptionId>;
  dateLabel: string | undefined;
  timespanFilterRef: MutableRef<HTMLDivElement | null>;
};

export const useHistoryCard: UseHistoryCard = (today) => {
  const { readingHistoryConfigProvider } = today;
  const { t, language } = useI18n();
  const {
    userFilters,
    userProfileMap,
    toggleUserFilter,
    timespan,
    selectYear,
    selectDay,
  } = useSocialSectionContext();

  const userFilterOpen = useSignal<boolean>(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const optionsContainerRef = useRef<HTMLDivElement | null>(null);

  // The timespan filter row scrolls horizontally with the vertical wheel.
  const timespanFilterRef = useRef<HTMLDivElement | null>(null);
  useHorizontalScroll(timespanFilterRef);

  useClickOutside([optionsRef, optionsContainerRef], () => {
    userFilterOpen.value = false;
  });

  const userFilterIcon = useComputed(() =>
    userFilterOpen.value ? "keyboard_arrow_up" : "keyboard_arrow_down"
  );

  const handleUserFilterClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    userFilterOpen.value = !userFilterOpen.value;
  }, []);

  const selectedTimespanOptionId = useSignal<TimespanOptionId>("twoDays");

  const handleTimespanOptionClick = useCallback(
    (id: TimespanOptionId) => {
      if (selectedTimespanOptionId.value === id) return;

      const option = readingHistoryConfigProvider.buildTimespanOptionsMap()[id];
      selectedTimespanOptionId.value = id;
      // `selectYear` sets the year and clears the timespan; `selectDay` then
      // narrows to the option's window. Both writes batch within this handler.
      selectYear(option.year);
      if (option.timespan) {
        selectDay(option.timespan);
      }
    },
    [selectYear, selectDay]
  );

  // Mirror `t` into a signal so the computed re-runs on language change.
  const translateSignal = useSignal(t);
  useEffect(() => {
    translateSignal.value = t;
  }, [t]);

  const timespanFilterOptionsData = useComputed<TimespanFilterOptionData[]>(
    () => {
      // Shadowed so the lookups below are plain `t("…")` calls — the shape the
      // i18n lint rules and the usage scanner match on — while still reading the
      // signal that makes this computed re-run on a language change.
      const t = translateSignal.value;
      const labels: Record<TimespanOptionId, string> = {
        twoDays: t("last-48-hours", { defaultValue: "Last 48 hours" }),
        week: t("this-week", { defaultValue: "This week" }),
        month: t("this-month", { defaultValue: "This month" }),
        all: t("all", { defaultValue: "All" }),
      };
      const keys = ["twoDays", "week", "month", "all"] as const;

      return keys.map((key) => ({
        label: labels[key],
        id: key,
        onClick: () => handleTimespanOptionClick(key),
        isSelected: selectedTimespanOptionId.value === key,
      }));
    }
  );

  const handleFilterOptionClick = useCallback(
    (e: MouseEvent, id: string) => {
      e.stopPropagation();
      toggleUserFilter(id);
    },
    [toggleUserFilter]
  );

  const userFilterText = useMemo(() => {
    const count = [...userFilters.values()].filter((value) => value).length;
    if (count === userFilters.size) {
      return t("everyone", { defaultValue: "Everyone" });
    }
    if (count === 0) {
      return t("none", { defaultValue: "None" });
    }
    return t("custom", { defaultValue: "Custom" });
  }, [userFilters, t]);

  const dateLabel = useMemo(() => {
    if (!timespan) return undefined;

    const date = new Date(timespan.to * 1000);

    return new Intl.DateTimeFormat(language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }, [timespan, language]);

  return {
    userFilterOpen,
    userFilterIcon,
    handleUserFilterClick,
    optionsRef,
    optionsContainerRef,
    userFilters,
    userProfileMap,
    handleFilterOptionClick,
    userFilterText,
    timespanFilterOptionsData,
    selectedTimespanOptionId,
    dateLabel,
    timespanFilterRef,
  };
};
