import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useComputed, useSignal } from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";
import { useSocialSectionContext } from "../contexts/socialSection/SocialSectionContext";
import type { BookData } from "../components/containers/FilteredReading";

const { useEffect } = os.appHooks;

type UseFilteredReading = (props: {
  timespanId: CommunityReadingSpanId | "all";
}) => {
  booksData: BookData[];
};

export const useFilteredReading: UseFilteredReading = ({ timespanId }) => {
  const { communityReading } = useTodayContext();
  const { userFilters } = useSocialSectionContext();

  const filtersMap = useSignal(new Map(userFilters));

  useEffect(() => {
    filtersMap.value = new Map(userFilters);
  }, [userFilters]);

  const timespanSignal = useSignal(timespanId);

  useEffect(() => {
    timespanSignal.value = timespanId;
  }, [timespanId]);

  const booksData = useComputed<BookData[]>(() => {
    const data: BookData[] = [];

    if (timespanSignal.value === "all") {
      return [];
    }

    const filteredReading = communityReading.value[timespanSignal.value];

    const bookEntries = Object.entries(filteredReading);
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
        return filtersMap.value.get(id);
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
  });

  return { booksData: booksData.value };
};
