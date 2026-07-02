import type { OverlayProps } from "ext_discover.interfaces.components.Overlay";

export function Overlay({
  position = {},
  onClose,
  items = [],
  styles,
  children,
}: OverlayProps) {
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div
        onClick={onClose}
        style={{
          ...position,
          width: "206px",
          padding: "1rem",
          ...styles,
        }}
        className="overlay linked-item-custom"
      >
        {children}
        {items.map((ele, index) => (
          <div
            key={`${ele.label}-${index}`}
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
                  color: ele.disabled ? "rgb(142 140 140) !important" : "white",
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
        ))}
      </div>
    </>
  );
}
