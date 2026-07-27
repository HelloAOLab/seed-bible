import { memo } from "preact/compat";

export interface BooksContainerProps {
  children: React.ReactNode;
  masonry?: boolean;
}

export const BooksContainer = memo(
  ({ children, masonry = true }: BooksContainerProps) => {
    return (
      <div
        className={`scripture-map-books-container${
          masonry ? " scripture-map-books-container-masonry" : ""
        }`}
      >
        {children}
      </div>
    );
  }
);
