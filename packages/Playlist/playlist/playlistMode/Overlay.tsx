const Overlay = ({
  position,
  onClose,
  positionOverRide = {},
  items,
  styles,
  children,
}) => {
  return (
    <>
      <div className="backdrop" onClick={() => onClose()} />
      <div
        onClick={() => onClose()}
        style={{
          ...position,
          width: "200px",
          padding: "1rem",
          ...styles,
          ...positionOverRide,
        }}
        className="overlay linked-item-custom"
      >
        {children}
        {items.map((ele) => {
          return (
            <div
              className={`more-menu-items ${ele.disabled ? "inactive" : ""} ${ele.noBorderBottom ? "noBorderBottom" : ""}`}
              onClick={() => {
                ele.click();
              }}
              style={{
                borderRadius: ele.disabled ? "4px" : "",
                cursor: ele.disabled ? "not-allowed" : "",
              }}
            >
              {!!ele.icon && (
                <span
                  style={{
                    color: ele.disabled
                      ? "rgb(142 140 140) !important"
                      : "white",
                  }}
                  class="material-symbols-outlined"
                >
                  {ele.icon}
                </span>
              )}
              <p
                style={{
                  color: ele.disabled ? "rgb(142 140 140) !important" : "white",
                }}
              >
                {ele.label}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
};

return Overlay;
