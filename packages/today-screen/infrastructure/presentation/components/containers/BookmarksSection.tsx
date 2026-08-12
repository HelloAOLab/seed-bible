import { useBookmarksSection } from "../../hooks/useBookmarksSection";
import { TitledSection } from "../ui/TitledSection";
import { BookmarksCategory, type BookmarkData } from "./BookmarksCategory";

export type CategorizedBookmarks = Map<string, BookmarkData[]>;

export const BookmarksSection = () => {
  const { label, categorizedBookmarks, moreButtonData, containerRef } =
    useBookmarksSection();

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
