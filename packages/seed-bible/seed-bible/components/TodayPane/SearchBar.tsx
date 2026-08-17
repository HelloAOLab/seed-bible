import { useSearchBar } from "./useSearchBar";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";

export const SearchBar = () => {
  const { t } = useI18n();
  const {
    query,
    results,
    loading,
    error,
    isOpen,
    placeholder,
    containerRef,
    runSearch,
    handleFocus,
    handleSelect,
  } = useSearchBar();

  const showDropdown = isOpen.value && query.value.trim().length > 0;

  return (
    <div className="today-searchbar" ref={containerRef}>
      <MaterialIcon>search</MaterialIcon>
      <input
        type="text"
        placeholder={placeholder}
        value={query.value}
        onInput={(e) => runSearch((e.target as HTMLInputElement).value)}
        onFocus={handleFocus}
      />
      {showDropdown && (
        <div className="today-searchbar-dropdown">
          {loading.value && (
            <div className="today-searchbar-status">
              {t("searching", { defaultValue: "Searching..." })}
            </div>
          )}

          {!loading.value && error.value && (
            <div className="today-searchbar-status today-searchbar-status-error">
              {error.value}
            </div>
          )}

          {!loading.value && !error.value && results.value.length === 0 && (
            <div className="today-searchbar-status">
              {t("no-search-results", {
                defaultValue: "No matching verses.",
              })}
            </div>
          )}

          {!loading.value &&
            !error.value &&
            results.value.map((result) => (
              <button
                key={result.id}
                type="button"
                className="today-searchbar-result"
                onClick={() => handleSelect(result)}
              >
                <span className="today-searchbar-result-ref">
                  {result.reference}
                </span>
                <span className="today-searchbar-result-text">
                  {result.text}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
