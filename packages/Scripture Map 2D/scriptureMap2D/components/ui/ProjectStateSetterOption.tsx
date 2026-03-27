import type { ProjectStateSetterOptionType } from "scriptureMap2D.main.types";

export const ProjectStateSetterOption: ProjectStateSetterOptionType = ({
  content,
  onClick,
}) => {
  return (
    <span
      onClick={onClick}
      className="project-state-button project-state-setter-option"
    >
      {content.iconStyle && (
        <div style={content.iconStyle} className="filter-option-icon"></div>
      )}
      {content.title}
    </span>
  );
};
