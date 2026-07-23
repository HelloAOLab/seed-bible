import { useBookmarksSection } from "../../hooks/useBookmarksSection";
import { Divider } from "../ui/Divider";
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
          ([category, bookmarksData], index) => {
            const elements = [
              <BookmarksCategory
                key={category}
                label={`${category}:`}
                bookmarksData={bookmarksData}
              />,
            ];
            if (index > 0) {
              elements.unshift(<Divider />);
            }
            return elements;
          }
        )}
      </div>
    </TitledSection>
  );
};
