import { memo } from "preact/compat";
import { useRef } from "preact/hooks";
import { useMasonryLayout } from "../../hooks/useMasonryLayout";

export interface BooksContainerProps {
  children: React.ReactNode;
  masonry?: boolean;
}

export const BooksContainer = memo(
  ({ children, masonry = false }: BooksContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useMasonryLayout(containerRef, masonry);

    return (
      <div
        ref={containerRef}
        className={`scripture-map-books-container${
          masonry ? " scripture-map-books-container-masonry" : ""
        }`}
      >
        {children}
      </div>
    );
  }
);
