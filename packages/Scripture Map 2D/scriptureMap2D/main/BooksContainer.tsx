const { memo } = os.appCompat;

export const BooksContainer = memo(({ children }) => {
  return <div className="books-container">{children}</div>;
});
