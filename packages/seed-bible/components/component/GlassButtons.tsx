const GlassButton = (props: any) => {
  const { children, onClick, isDisabled, style = {} } = props;
  return (
    <>
      <style>{thisBot.tags["glass-button.css"]}</style>
      <button
        disabled={isDisabled}
        className="glass-button"
        onClick={(e) => {
          shout("playSound", { soundName: "DialogClick" });
          onClick(e);
        }}
        style={{
          ...style,
        }}
      >
        {children}
      </button>
    </>
  );
};

return GlassButton;
