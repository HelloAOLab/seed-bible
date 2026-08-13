import type { DividedSection } from "./TodayContent";
import { useTodayContext } from "./TodayContext";

import { useMemo } from "preact/hooks";

type UseTodayContent = () => {
  showResumeReading: boolean;
  showBookmarks: boolean;
  dividedSectionsIds: DividedSection[];
};

export const useTodayContent: UseTodayContent = () => {
  const { readingHistory, bookmarks } = useTodayContext();

  // Show the resume section (as a placeholder) while history is still loading,
  // and (with real data) once it is ready. `empty` renders Welcome instead, so
  // it never reaches here.
  const status = readingHistory.value.status;
  const showResumeReading = status === "loading" || status === "ready";
  const showBookmarks = bookmarks.value.length > 0;
  const showSearch = true;
  const showSocial = true;

  const dividedSectionsIds = useMemo<DividedSection[]>(() => {
    const sectionsData: DividedSection[] = [];

    if (showSearch) {
      sectionsData.push("search");
    }
    if (showSocial) {
      sectionsData.push("social");
    }
    return sectionsData;
  }, [showSearch, showSocial]);

  return {
    showResumeReading,
    showBookmarks,
    dividedSectionsIds,
  };
};
