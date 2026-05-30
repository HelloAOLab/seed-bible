import { useTodayContext } from "../contexts/today/TodayContext";
import { useSignal, useComputed } from "@preact/signals";
import type { TimespanFilterOptionData } from "../components/containers/SocialSection";
import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";

const { useMemo, useCallback } = os.appHooks;

type UseSocialSection = () => {
  title: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
  userFilterIcon: string;
  userFilterOpen: boolean;
  handleUserFilterClick: () => void;
  timespanFilterOptionsData: TimespanFilterOptionData[];
};

const TimespanOptionLabelMap: Record<CommunityReadingSpanId | "all", string> = {
  all: "All",
  month: "this-month",
  week: "this-week",
  twoDays: "last-48-hours",
};

export const useSocialSection: UseSocialSection = () => {
  const { translate, MaterialIcon } = useTodayContext();

  const userFilterOpen = useSignal<boolean>(false);
  const selectedTimespanOptionId = useSignal<CommunityReadingSpanId | "all">(
    "twoDays"
  );

  const title = useMemo(() => {
    return translate("community");
  }, [translate]);

  const userFilterIcon = useComputed(() =>
    userFilterOpen.value ? "keyboard_arrow_up" : "keyboard_arrow_down"
  );

  const handleUserFilterClick = useCallback(() => {
    userFilterOpen.value = !userFilterOpen.value;
  }, []);

  const handleTimespanOptionClick = useCallback(
    (id: CommunityReadingSpanId | "all") => {
      selectedTimespanOptionId.value = id;
    },
    []
  );

  const timespanFilterOptionsData = useComputed<TimespanFilterOptionData[]>(
    () => {
      const keys = ["twoDays", "week", "month", "all"] as const;

      return keys.map((key) => ({
        label: translate(TimespanOptionLabelMap[key]),
        id: key,
        onClick: () => handleTimespanOptionClick(key),
        isSelected: selectedTimespanOptionId.value === key,
      }));
    }
  );

  return {
    title,
    MaterialIcon,
    userFilterOpen: userFilterOpen.value,
    userFilterIcon: userFilterIcon.value,
    handleUserFilterClick,
    timespanFilterOptionsData: timespanFilterOptionsData.value,
    handleTimespanOptionClick,
  };
};
