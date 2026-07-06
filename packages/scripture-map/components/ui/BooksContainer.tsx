import { memo } from "preact/compat";

export interface BooksContainerProps {
  children: React.ReactNode;
}

export const BooksContainer = memo(({ children }: BooksContainerProps) => {
  return <div className="scripture-map-books-container">{children}</div>;
});
