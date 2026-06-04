import { useTodayContext } from "../contexts/today/TodayContext";
import { useSignal, useComputed } from "@preact/signals";
import type { TimespanFilterOptionData } from "../components/containers/SocialSection";
import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useEffect, useState, type MutableRef } from "preact/hooks";
import { useClickOutside } from "./useClickOutside";

const { useRef, useMemo, useCallback } = os.appHooks;

type UseSocialSection = () => {
  title: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
  userFilterIcon: string;
  userFilterOpen: boolean;
  handleUserFilterClick: (e: MouseEvent) => void;
  timespanFilterOptionsData: TimespanFilterOptionData[];
  selectedTimespanOptionId: CommunityReadingSpanId | "all";
  userProfileMap: Map<
    string,
    {
      name: string;
      pictureUrl?: string | null | undefined;
      color: string;
      icon: string;
    }
  >;
  userFilters: Map<string, boolean>;
  handleFilterOptionClick: (event: MouseEvent, id: string) => void;
  userFilterText: string;
  optionsRef: MutableRef<HTMLDivElement | null>;
  optionsContainerRef: MutableRef<HTMLDivElement | null>;
};

const TimespanOptionLabelMap: Record<CommunityReadingSpanId | "all", string> = {
  all: "All",
  month: "this-month",
  week: "this-week",
  twoDays: "last-48-hours",
};

export const useSocialSection: UseSocialSection = () => {
  const {
    translate,
    MaterialIcon,
    subscribedUsersProfileProvider,
    subscribedUsersIdsProvider,
  } = useTodayContext();

  const userFilterOpen = useSignal<boolean>(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const optionsContainerRef = useRef<HTMLDivElement | null>(null);

  useClickOutside([optionsRef, optionsContainerRef], () => {
    userFilterOpen.value = false;
  });

  const selectedTimespanOptionId = useSignal<CommunityReadingSpanId | "all">(
    "twoDays"
  );

  const title = useMemo(() => {
    return translate("community");
  }, [translate]);

  const userFilterIcon = useComputed(() =>
    userFilterOpen.value ? "keyboard_arrow_up" : "keyboard_arrow_down"
  );

  const handleUserFilterClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    userFilterOpen.value = !userFilterOpen.value;
  }, []);

  const handleTimespanOptionClick = useCallback(
    (id: CommunityReadingSpanId | "all") => {
      selectedTimespanOptionId.value = id;
    },
    []
  );

  const translateSignal = useSignal(translate);

  useEffect(() => {
    translateSignal.value = translate;
  }, [translate]);

  const timespanFilterOptionsData = useComputed<TimespanFilterOptionData[]>(
    () => {
      const keys = ["twoDays", "week", "month", "all"] as const;

      return keys.map((key) => ({
        label: translateSignal.value(TimespanOptionLabelMap[key]),
        id: key,
        onClick: () => handleTimespanOptionClick(key),
        isSelected: selectedTimespanOptionId.value === key,
      }));
    }
  );

  const [userProfileMap] = useState(
    () =>
      new Map(
        subscribedUsersIdsProvider.getUsersIds().map((id) => {
          const profile = subscribedUsersProfileProvider.getUserProfile(id)!;
          return [id, profile];
        })
      )
  );

  const [userFilters, setUserFilters] = useState(() => {
    return new Map(
      [...userProfileMap.entries()].map(([id]) => {
        return [id, true];
      })
    );
  });

  const handleFilterOptionClick = useCallback(
    (e: MouseEvent, id: string) => {
      e.stopPropagation();

      setUserFilters((prev) => {
        prev.set(id, !prev.get(id));
        return new Map(prev);
      });
    },
    [setUserFilters]
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

  return {
    title,
    MaterialIcon,
    userFilterOpen: userFilterOpen.value,
    userFilterIcon: userFilterIcon.value,
    handleUserFilterClick,
    timespanFilterOptionsData: timespanFilterOptionsData.value,
    handleTimespanOptionClick,
    selectedTimespanOptionId: selectedTimespanOptionId.value,
    userFilters,
    userProfileMap,
    handleFilterOptionClick,
    userFilterText,
    optionsRef,
    optionsContainerRef,
  };
};
