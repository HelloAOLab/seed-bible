import { Book, type BookProps } from "./Book";
import { useFilteredReading } from "../../hooks/useFilteredReading";

export interface BookData extends BookProps {
  key: string;
}

export const FilteredReading = () => {
  const { booksData } = useFilteredReading();

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
