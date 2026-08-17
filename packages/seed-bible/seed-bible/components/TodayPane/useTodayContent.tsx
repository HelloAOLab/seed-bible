import type { ReadonlySignal } from "@preact/signals";
import type { DividedSection } from "./TodayContent";
import type { Bookmark } from "../../managers/BookmarksManager";
import type { TodayManager } from "../../managers/TodayManager";

import { useMemo } from "preact/hooks";

type UseTodayContent = (props: {
  today: TodayManager;
  bookmarks: ReadonlySignal<Bookmark[]>;
}) => {
  showResumeReading: boolean;
  showBookmarks: boolean;
  dividedSectionsIds: DividedSection[];
};

export const useTodayContent: UseTodayContent = ({ today, bookmarks }) => {
  // Show the resume section (as a placeholder) while history is still loading,
  // and (with real data) once it is ready. `empty` renders Welcome instead, so
  // it never reaches here.
  const status = today.readingHistory.value.status;
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
