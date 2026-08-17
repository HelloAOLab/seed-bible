import { Book, type BookProps } from "./Book";
import { useFilteredReading } from "./useFilteredReading";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

export interface BookData extends BookProps {
  key: string;
}

export const FilteredReading = (props: {
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { booksData } = useFilteredReading();

  if (booksData.length === 0) {
    return <></>;
  }

  return (
    <div className="filtered-reading-container">
      {booksData.map(({ key, ...rest }) => (
        <Book
          key={key}
          {...rest}
          today={props.today}
          onOpenPassage={props.onOpenPassage}
        />
      ))}
    </div>
  );
};
