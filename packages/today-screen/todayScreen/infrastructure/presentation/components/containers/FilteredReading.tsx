import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { Book, type BookProps } from "./Book";
import { useFilteredReading } from "../../hooks/useFilteredReading";

export interface BookData extends BookProps {
  key: string;
}

export const FilteredReading = ({
  timespanId,
}: {
  timespanId: CommunityReadingSpanId | "all";
}) => {
  const { booksData } = useFilteredReading({ timespanId });

  if (booksData.length === 0) {
    return <></>;
  }

  return (
    <div className="filtered-reading-container">
      {booksData.map(({ key, ...rest }) => (
        <Book key={key} {...rest} />
      ))}
    </div>
  );
};
