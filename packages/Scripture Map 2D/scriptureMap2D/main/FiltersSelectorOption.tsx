export const FiltersSelectorOption = ({
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
