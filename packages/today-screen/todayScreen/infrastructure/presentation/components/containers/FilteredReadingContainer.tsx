import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { FilteredReadingBook } from "./FilteredReadingBook";
import { useFilteredReadingContainer } from "../../hooks/useFilteredReadingContainer";

export interface BookData {
  bookId: string;
  chapter: number;
  usersId: string[];
  key: string;
}

export const FilteredReadingContainer = ({
  timespanId,
  userFilters,
}: {
  timespanId: CommunityReadingSpanId;
  userFilters: { id: string; name: string; selected: boolean; color: string }[];
}) => {
  const { booksData } = useFilteredReadingContainer({
    timespanId,
    userFilters,
  });

  return (
    <div className="filtered-reading-container">
      {booksData.map(({ key, ...rest }) => (
        <FilteredReadingBook key={key} {...rest} />
      ))}
    </div>
  );
};
