const { memo } = os.appCompat;

export interface BooksContainerProps {
  children: React.ReactNode;
}

export const BooksContainer = memo(({ children }: BooksContainerProps) => {
  return <div className="books-container">{children}</div>;
});
