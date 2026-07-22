import { useBookmarksSection } from "../../hooks/useBookmarksSection";
import { TitledSection } from "../ui/TitledSection";
import { BookmarksCategory, type BookmarkData } from "./BookmarksCategory";

export type CategorizedBookmarks = Record<string, BookmarkData[]>;

// export type MoreButtonData = {
//   handleClick: () => void;
//   text: string;
// };

// const MoreButton = ({ handleClick, text }: MoreButtonData) => {
//   return (
//     <button
//       onClick={handleClick}
//       className={"bookmarks-section-more-button clickable"}
//     >
//       {text}
//     </button>
//   );
// };

export const BookmarksSection = () => {
  const { label, categorizedBookmarks } = useBookmarksSection();

  return (
    <TitledSection title={label.value}>
      <div className={"bookmarks-section"}>
        {Object.entries(categorizedBookmarks.value).map(
          ([category, bookmarksData]) => {
            return (
              <BookmarksCategory
                label={`${category}:`}
                bookmarksData={bookmarksData}
              />
            );
          }
        )}
        {/* {moreButtonData.value && <MoreButton {...moreButtonData.value} />} */}
      </div>
    </TitledSection>
  );
};
