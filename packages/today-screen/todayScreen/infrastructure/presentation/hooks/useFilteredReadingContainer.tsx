import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useComputed, useSignal } from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";
import type { BookData } from "../components/containers/FilteredReadingContainer";

const { useEffect } = os.appHooks;

type UseFilteredReadingContainer = (props: {
  timespanId: CommunityReadingSpanId;
  userFilters: { id: string; name: string; selected: boolean; color: string }[];
}) => {
  booksData: BookData[];
};

export const useFilteredReadingContainer: UseFilteredReadingContainer = ({
  timespanId,
  userFilters,
}) => {
  const { communityReading } = useTodayContext();

  const filtersMap = useSignal(
    new Map(userFilters.map((filter) => [filter.id, filter.selected]))
  );

  useEffect(() => {
    filtersMap.value = new Map(
      userFilters.map((filter) => [filter.id, filter.selected])
    );
  }, [userFilters]);

  const timespanSignal = useSignal(timespanId);

  useEffect(() => {
    timespanSignal.value = timespanId;
  }, [timespanId]);

  const booksData = useComputed<BookData[]>(() => {
    const data: BookData[] = [];

    const filteredReading = communityReading.value[timespanSignal.value];

    const bookEntries = Object.entries(filteredReading);
    for (const [bookId, chapters] of bookEntries) {
      const chapterEntries = Object.entries(chapters);
      for (const [chapter, ids] of chapterEntries) {
        const filteredIds = ids.filter((id) => {
          return filtersMap.value.get(id);
        });
        if (filteredIds.length > 0) {
          data.push({
            bookId,
            chapter: Number(chapter),
            usersId: filteredIds,
            key: `${bookId}-${chapter}`,
          });
        }
      }
    }

    return data;
  });

  return { booksData: booksData.value };
};
