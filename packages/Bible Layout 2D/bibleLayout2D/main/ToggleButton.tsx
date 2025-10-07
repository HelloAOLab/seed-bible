export const ToggleButton = ({ name, enabled, onClick, iconName }) => {
  return (
    <button
      onClick={onClick}
      className={`toggleButton${enabled ? " enabled" : ""}`}
    >
      {iconName && (
        <span className="material-symbols-outlined">{iconName}</span>
      )}
      {name}
    </button>
  );
};
