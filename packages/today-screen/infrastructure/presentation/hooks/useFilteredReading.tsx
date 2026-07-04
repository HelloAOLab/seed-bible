import { useSocialSectionContext } from "../contexts/socialSection/SocialSectionContext";
import type { BookData } from "../components/containers/FilteredReading";

import { useMemo } from "preact/hooks";

type UseFilteredReading = () => {
  booksData: BookData[];
};

export const useFilteredReading: UseFilteredReading = () => {
  const { communityReading, userFilters } = useSocialSectionContext();

  const booksData = useMemo<BookData[]>(() => {
    const data: BookData[] = [];

    const bookEntries = Object.entries(communityReading);
    for (const [bookId, chapters] of bookEntries) {
      const chapterEntries = Object.entries(chapters);
      const ids = [
        ...new Set(
          chapterEntries.flatMap(([, chapterIds]) => {
            return chapterIds;
          })
        ),
      ];
      const filteredIds = ids.filter((id) => {
        return userFilters.get(id);
      });
      if (filteredIds.length > 0) {
        data.push({
          bookId,
          chaptersReading: chapters,
          usersId: filteredIds,
          key: bookId,
        });
      }
    }

    return data;
  }, [communityReading, userFilters]);

  return { booksData };
};
