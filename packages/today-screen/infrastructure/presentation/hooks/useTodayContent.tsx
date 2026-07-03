import type { DividedSection } from "../components/containers/TodayContent";
import { useTodayContext } from "../contexts/today/TodayContext";

import { useMemo } from "preact/hooks";

type UseTodayContent = () => {
  showResumeReading: boolean;
  dividedSectionsIds: DividedSection[];
};

export const useTodayContent: UseTodayContent = () => {
  const { userLastReading, bookmarks } = useTodayContext();

  const showResumeReading = !!userLastReading.value;
  const showBookmarks = bookmarks.value.length > 0;
  const showSearch = true;
  const showRecommendations = false;
  const showSocial = true;

  const dividedSectionsIds = useMemo<DividedSection[]>(() => {
    const sectionsData: DividedSection[] = [];
    if (showBookmarks) {
      sectionsData.push("bookmarks");
    }
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
