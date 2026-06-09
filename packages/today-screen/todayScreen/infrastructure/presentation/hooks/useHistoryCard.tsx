import { useSignal, useComputed } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import { useEffect, type MutableRef } from "preact/hooks";
import { useTodayContext } from "../contexts/today/TodayContext";
import {
  useSocialSectionContext,
  type SocialSectionUserProfile,
} from "../contexts/socialSection/SocialSectionContext";
import { useClickOutside } from "./useClickOutside";
import type {
  TimespanFilterOptionData,
  TimespanOptionId,
} from "@packages/today-screen/todayScreen/domain/models/readingHistory";

const { useRef, useMemo, useCallback } = os.appHooks;

type UseHistoryCard = () => {
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
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
};

export const useHistoryCard: UseHistoryCard = () => {
  const { translate, MaterialIcon, language, readingHistoryConfigProvider } =
    useTodayContext();
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

  // Mirror `translate` into a signal so the computed re-runs on language change.
  const translateSignal = useSignal(translate);
  useEffect(() => {
    translateSignal.value = translate;
  }, [translate]);

  const timespanFilterOptionsData = useComputed<TimespanFilterOptionData[]>(
    () => {
      const keys = ["twoDays", "week", "month", "all"] as const;

      return keys.map((key) => ({
        label: translateSignal.value(
          readingHistoryConfigProvider.getTimespanOptionLabelMap()[key]
        ),
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
      return translate("Everyone");
    }
    if (count === 0) {
      return translate("None");
    }
    return translate("Custom");
  }, [userFilters, translate]);

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
    MaterialIcon,
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
  };
};
