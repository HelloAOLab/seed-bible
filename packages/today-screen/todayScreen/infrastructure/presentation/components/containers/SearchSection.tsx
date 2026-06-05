import { useSearchSection } from "../../hooks/useSearchSection";
import { TitledSection } from "../ui/TitledSection";
import { SearchBar } from "./SearchBar";

export const SearchSection = () => {
  const { title, selectorText, openBookSelector, SeedBibleIcon } =
    useSearchSection();

  return (
    <TitledSection title={title}>
      <div className="search-container">
        <button
          className="book-selector-button clickable"
          type="button"
          onClick={openBookSelector}
        >
          <SeedBibleIcon size={24} />
          {selectorText}
        </button>
        <SearchBar />
      </div>
    </TitledSection>
  );
};
