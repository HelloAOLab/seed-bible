export const ProjectStateSetterOption = ({ content, onClick }) => {
  return (
    <span
      onClick={onClick}
      className="projectStateButton projectStateSetterOption"
    >
      {content}
    </span>
  );
};
