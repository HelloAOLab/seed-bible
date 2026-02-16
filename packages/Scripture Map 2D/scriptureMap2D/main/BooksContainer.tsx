import type { BooksContainerType } from "scriptureMap2D.main.types";

const { memo } = os.appCompat;

export const BooksContainer = memo<BooksContainerType>(({ children }) => {
  return <div className="books-container">{children}</div>;
});
