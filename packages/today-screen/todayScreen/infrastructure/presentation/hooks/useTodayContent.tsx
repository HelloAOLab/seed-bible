import type { DividedSection } from "../components/containers/TodayContent";
import { useTodayContext } from "../contexts/today/TodayContext";

const { useMemo } = os.appHooks;

type UseTodayContent = () => {
  showResumeReading: boolean;
  dividedSectionsIds: DividedSection[];
};

export const useTodayContent: UseTodayContent = () => {
  const { userId } = useTodayContext();

  const showResumeReading = !!userId;
  const showSearch = true;
  const showRecommendations = false;
  const showSocial = true;

  const dividedSectionsIds = useMemo<DividedSection[]>(() => {
    const sectionsData: DividedSection[] = [];
    if (showSearch) {
      sectionsData.push("search");
    }
    if (showRecommendations) {
      sectionsData.push("recommendations");
    }
    if (showSocial) {
      sectionsData.push("social");
    }
    return sectionsData;
  }, [showSearch, showRecommendations, showSocial]);

  return {
    showResumeReading,
    dividedSectionsIds,
  };
};
