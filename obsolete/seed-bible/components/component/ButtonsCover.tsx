const ButtonsCover = (props: any) => {
  const { children, secondary, style = {} } = props;
  return (
    <>
      <style>{thisBot.tags["button-cover.css"]}</style>
      <div
        style={style}
        className={`button-cover ${secondary ? "secondary" : ""}`}
      >
        {children}
      </div>
    </>
  );
};

return ButtonsCover;
