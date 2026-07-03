import { useSearchSection } from "../../hooks/useSearchSection";
import { TitledSection } from "../ui/TitledSection";
import { SearchBar } from "./SearchBar";
import { SeedBibleIcon } from "../ui/SeedBibleIcon";

export const SearchSection = () => {
  const { title, selectorText, openBookSelector, seedBibleIconStyle } =
    useSearchSection();

  return (
    <TitledSection title={title}>
      <div className="search-container">
        <button
          className="book-selector-button clickable"
          type="button"
          onClick={openBookSelector}
        >
          <SeedBibleIcon style={seedBibleIconStyle} />
          {selectorText}
        </button>
        <SearchBar />
      </div>
    </TitledSection>
  );
};
