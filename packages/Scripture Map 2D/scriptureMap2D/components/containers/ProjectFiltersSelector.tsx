import { FiltersSelectorOption } from "scriptureMap2D.components.ui.FiltersSelectorOption";
import { useProjectFiltersSelector } from "scriptureMap2D.hooks.useProjectFiltersSelector";

export const ProjectFiltersSelector = () => {
  const {
    allSelectorOptionContent,
    allSelectorOptionClick,
    allSelected,
    selectorOptionsData,
  } = useProjectFiltersSelector();

  return (
    <div className="project-filters-selector">
      <FiltersSelectorOption
        content={allSelectorOptionContent}
        onClick={allSelectorOptionClick}
        selected={allSelected}
      />
      {selectorOptionsData.map((data) => (
        <FiltersSelectorOption {...data} />
      ))}
    </div>
  );
};
