import { useSearchBar } from "../../hooks/useSearchBar";

export const SearchBar = () => {
  const { query, setQuery, results, handleSelect, translate, MaterialIcon } =
    useSearchBar();

  return (
    <div className="today-searchbar">
      <MaterialIcon>search</MaterialIcon>
      <input
        type="text"
        placeholder={translate("search-books", {
          defaultValue: "Search books...",
        })}
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      {query.length > 0 && results.length > 0 && (
        <div className="today-searchbar-dropdown">
          {results.map((book) => (
            <button
              key={book.id}
              type="button"
              className="today-searchbar-result"
              onClick={() => handleSelect(book.id)}
            >
              {book.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
