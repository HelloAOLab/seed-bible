import { useReadingHistoryUserFiltersSelector } from "../../hooks/useReadingHistoryUserFiltersSelector";
import { SelectorOptionClasses, SelectorOption } from "../ui/SelectorOption";

export const ReadingHistoryUserFiltersSelector = () => {
  const {
    allSelectorOptionContent,
    allSelectorOptionClick,
    allSelected,
    selectorOptionsData,
  } = useReadingHistoryUserFiltersSelector();

  return (
    <div className="reading-history-user-selector">
      <SelectorOption
        content={allSelectorOptionContent}
        onClick={allSelectorOptionClick}
        selected={allSelected}
        className={SelectorOptionClasses.UserFilter}
      />
      {selectorOptionsData.map((data) => (
        <SelectorOption {...data} />
      ))}
    </div>
  );
};
