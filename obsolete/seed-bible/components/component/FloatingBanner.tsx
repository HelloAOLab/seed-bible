const FloatingBanner = (props: any) => {
  const {
    children,
    doNotFloat = false,
    bgColor = "white",
    color = "black",
    zIndex = 99000,
  } = props;
  return (
    <>
      <style>{thisBot.tags["floating-banner.css"]}</style>
      <div
        className={`floating-banner ${doNotFloat ? "not-float" : ""}`}
        style={{ backgroundColor: bgColor, color, zIndex }}
      >
        {children}
      </div>
    </>
  );
};

return FloatingBanner;
