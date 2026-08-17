import type { ReadonlySignal } from "@preact/signals";
import { useBookmarksSection } from "./useBookmarksSection";
import { TitledSection } from "./TitledSection";
import { BookmarksCategory, type BookmarkData } from "./BookmarksCategory";
import type { Bookmark } from "../../managers/BookmarksManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

export type CategorizedBookmarks = Map<string, BookmarkData[]>;

export const BookmarksSection = (props: {
  today: TodayManager;
  bookmarks: ReadonlySignal<Bookmark[]>;
  isMobile: ReadonlySignal<boolean>;
  onOpenPassage: (target: TodayPassageTarget) => void;
  onShowBookmarksList: () => void;
}) => {
  const { label, categorizedBookmarks, moreButtonData, containerRef } =
    useBookmarksSection(props);

  return (
    <TitledSection title={label.value} buttonData={moreButtonData.value}>
      <div className={"bookmarks-section"} ref={containerRef}>
        {Array.from(categorizedBookmarks.value.entries()).map(
          ([category, bookmarksData]) => {
            return (
              <BookmarksCategory
                key={category}
                label={`${category}:`}
                bookmarksData={bookmarksData}
              />
            );
          }
        )}
      </div>
    </TitledSection>
  );
};
