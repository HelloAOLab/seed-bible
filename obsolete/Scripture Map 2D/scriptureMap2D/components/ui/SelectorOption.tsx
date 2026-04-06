export interface SelectorOptionContent {
  title: string;
  iconStyle?: React.CSSProperties;
}

export const SelectorOptionClasses = {
  ProjectState: "project-state-setter-option",
  UserFilter: "project-filters-selector-option",
} as const;

export type SelectorOptionClass =
  (typeof SelectorOptionClasses)[keyof typeof SelectorOptionClasses];

export interface SelectorOptionProps {
  content: SelectorOptionContent;
  onClick: (event: MouseEvent) => void;
  selected?: boolean;
  className: SelectorOptionClass;
}

export interface SelectorOptionData extends SelectorOptionProps {
  key: string;
}

export const SelectorOption = ({
  content,
  onClick,
  selected = false,
  className,
}: SelectorOptionProps) => {
  return (
    <span
      onClick={onClick}
      className={`project-state-button ${className} ${selected ? " selected" : ""}`}
    >
      {content.iconStyle && (
        <div style={content.iconStyle} className="filter-option-icon"></div>
      )}
      {content.title}
    </span>
  );
};
