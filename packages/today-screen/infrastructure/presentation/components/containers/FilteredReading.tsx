import { Book, type BookProps } from "./Book";
import { useFilteredReading } from "../../hooks/useFilteredReading";
// import { useMicroGrid } from "../../hooks/useMicroGrid";

// const { useRef } = os.appHooks;

export interface BookData extends BookProps {
  key: string;
}

export const FilteredReading = () => {
  const { booksData } = useFilteredReading();
  // const containerRef = useRef<HTMLDivElement | null>(null);

  // Dense micro-grid: measures each card and snaps it to its column/row span.
  // useMicroGrid(containerRef, booksData);

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
