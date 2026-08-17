import type { ReadonlySignal } from "@preact/signals";
import { useSearchSection } from "./useSearchSection";
import { TitledSection } from "./TitledSection";
import { SearchBar } from "./SearchBar";
import { SeedBibleIcon } from "./SeedBibleIcon";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

export const SearchSection = (props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
  isMobile: ReadonlySignal<boolean>;
  onOpenBookSelector: () => void;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { title, selectorText, seedBibleIconStyle } = useSearchSection(props);

  return (
    <TitledSection title={title}>
      <div className="search-container">
        <button
          className="book-selector-button clickable"
          type="button"
          onClick={props.onOpenBookSelector}
        >
          <SeedBibleIcon style={seedBibleIconStyle} />
          {selectorText}
        </button>
        <SearchBar today={props.today} onOpenPassage={props.onOpenPassage} />
      </div>
    </TitledSection>
  );
};
