import { useTodayContext } from "../contexts/today/TodayContext";

const { useState, useMemo } = os.appHooks;

type BookResult = { id: string; name: string; commonName?: string };

type UseSearchBar = () => {
  query: string;
  setQuery: (value: string) => void;
  results: BookResult[];
  handleSelect: (bookId: string) => void;
  translate: (key: string, options?: Record<string, unknown>) => string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
};

export const useSearchBar: UseSearchBar = () => {
  const {
    translationBooks,
    addTab,
    getDefaultTranslation,
    translate,
    MaterialIcon,
  } = useTodayContext();

  const [query, setQuery] = useState("");

  const results = useMemo<BookResult[]>(() => {
    const trimmed = query.toLowerCase().trim();
    if (!trimmed) return [];
    const books = translationBooks.value?.books ?? [];
    return books.filter(
      (book) =>
        book.name.toLowerCase().includes(trimmed) ||
        (book.commonName && book.commonName.toLowerCase().includes(trimmed))
    );
  }, [query, translationBooks.value]);

  const handleSelect = (bookId: string) => {
    addTab(bookId, 1, getDefaultTranslation());
    setQuery("");
  };

  return { query, setQuery, results, handleSelect, translate, MaterialIcon };
};
