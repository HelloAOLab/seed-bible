import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useComputed, useSignal } from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";
import type { BookData } from "../components/containers/FilteredReading";

const { useEffect } = os.appHooks;

type UseFilteredReading = (props: {
  timespanId: CommunityReadingSpanId;
  userFilters: { id: string; name: string; selected: boolean; color: string }[];
}) => {
  booksData: BookData[];
};

export const useFilteredReading: UseFilteredReading = ({
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
