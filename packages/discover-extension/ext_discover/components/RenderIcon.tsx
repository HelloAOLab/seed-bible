import { getRenderIconManager } from "ext_discover.managers.RenderIconManager";
import type { RenderIconProps } from "ext_discover.interfaces.components.RenderIcon";

export function RenderIcon({
  isCustomIcons,
  big = false,
  small = false,
  isAllowSet = false,
  icon,
  list = [],
  onDelete,
  scope = "default",
  manager: managerProp,
}: RenderIconProps) {
  const manager = managerProp ?? getRenderIconManager(scope);
  manager.syncList(list);
  manager.setAllowSet(isAllowSet);

  const firstItemID = manager.firstItemId.value;

  return (
    <div
      className={`playlist-details-icon ${big ? " big" : ""} ${small ? " small" : ""} `}
      style={{
        position: "relative",
        backgroundColor: "var(--panelBackground)",
      }}
    >
      {isCustomIcons ? (
        <img src={icon} style={{ width: "24px" }} />
      ) : (
        <span>{firstItemID}</span>
      )}
      {onDelete && isCustomIcons && (
        <span
          onClick={onDelete}
          style={{
            cursor: "pointer",
            position: "absolute",
            bottom: "0.2rem",
            color: "#D36433",
            right: "0.2rem",
            fontSize: "12px",
            zIndex: "10",
          }}
          className="material-symbols-outlined unfollow"
        >
          delete
        </span>
      )}
    </div>
  );
}
