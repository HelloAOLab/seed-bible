import { LoadingContent } from "../components/ui/LoadingContent";
import type { DividedSection } from "../components/containers/TodayContent";
import { LoadedContent } from "../components/ui/LoadedContent";
import { useTodayContext } from "../contexts/today/TodayContext";

import { useMemo } from "preact/hooks";

type UseTodayContent = () => {
  showResumeReading: boolean;
  dividedSectionsIds: DividedSection[];
  Content: (params: {
    showResumeReading: boolean;
    dividedSectionsIds: DividedSection[];
  }) => preact.JSX.Element;
};

export const useTodayContent: UseTodayContent = () => {
  const { userLastReading, bookmarks, isLoadingLastReading } =
    useTodayContext();

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

  const Content = useMemo(() => {
    if (isLoadingLastReading.value) {
      return LoadingContent;
    }

    return LoadedContent;
  }, [isLoadingLastReading.value]);

  return {
    showResumeReading,
    dividedSectionsIds,
    Content,
  };
};
