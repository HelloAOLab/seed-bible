const LoaderSecondary = thisBot.LoaderSecondary();

const Button = ({
  children,
  loading,
  onClick,
  isOutline = false,
  isDisabled,
  secondaryAlt,
  small,
  exClass = "",
  secondary = false,
  color = "",
  backgroundColor = "",
  style = {},
  varient = "",
}) => {
  return (
    <>
      <style>{thisBot.tags["button.css"]}</style>
      <button
        disabled={isDisabled}
        onClick={(e) => {
          if (!loading && isDisabled) return;
          shout("playSound", { soundName: "DialogClick" });
          onClick(e);
        }}
        className={`custom-button ${exClass} ${small ? "small" : ""} ${secondaryAlt ? "secondaryAlt secondaryAltAlt" : ""}  ${secondary ? "secondaryAlt" : ""} ${varient} ${isOutline ? "outline" : ""}`}
        style={{
          color,
          backgroundColor,
          ...style,
        }}
      >
        {children}
        {loading ? <LoaderSecondary secondary={secondary} /> : null}
      </button>
    </>
  );
};

return Button;
