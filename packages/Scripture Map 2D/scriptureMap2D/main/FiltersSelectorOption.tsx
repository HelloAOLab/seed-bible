import type { FiltersSelectorOptionType } from "scriptureMap2D.main.types";

export const FiltersSelectorOption: FiltersSelectorOptionType = ({
  content,
  onClick,
  selected = false,
}) => {
  return (
    <span
      onClick={onClick}
      className={`project-state-button project-filters-selector-option${selected ? " selected" : ""}`}
    >
      {content}
    </span>
  );
};
