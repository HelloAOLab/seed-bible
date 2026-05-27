import { useProjectFiltersSelector } from "scriptureMap.hooks.useProjectFiltersSelector";
import {
  SelectorOptionClasses,
  SelectorOption,
} from "scriptureMap.components.ui.SelectorOption";

export const ProjectFiltersSelector = () => {
  const {
    allSelectorOptionContent,
    allSelectorOptionClick,
    allSelected,
    selectorOptionsData,
  } = useProjectFiltersSelector();

  return (
    <div className="project-filters-selector">
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
