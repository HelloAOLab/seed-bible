export const Tooltip = ({ content, anchor, direction = "up" }) => {
  return (
    <span
      className={`tooltip tooltip-${direction}`}
      style={{
        top: anchor.y,
        left: anchor.x,
      }}
    >
      {content}
    </span>
  );
};
