export const ProjectStateSetterOption = ({ content, onClick }) => {
  return (
    <span
      onClick={onClick}
      className="project-state-button project-state-setter-option"
    >
      {content}
    </span>
  );
};
