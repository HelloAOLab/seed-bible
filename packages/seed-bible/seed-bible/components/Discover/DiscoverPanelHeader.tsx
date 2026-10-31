import "./DiscoverPane.css";
import "./DiscoverPanelHeader.css";
import type { ComponentChild, ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import { MaterialIcon } from "../icons";

interface DiscoverPanelHeaderProps {
  title: ComponentChild;
  /** Buttons rendered before the close button, e.g. "+ Create". */
  actions?: ComponentChild;
  /** Shows a close (X) button when given. */
  onClose?: () => void;
}

/**
 * Title row shared by every Discover view: the compact panel beside the
 * scripture, the full panel in the side pane, and the create/play sub-views.
 * The side pane is opened without its own `PaneHeader`, so in there this is
 * the only header, and `onClose` is what closes the pane.
 */
export function DiscoverPanelHeader(props: DiscoverPanelHeaderProps) {
  const { title, actions, onClose } = props;
  const { t } = useI18n();

  return (
    <div className="sb-discover-panel-header">
      <div className="sb-discover-panel-header-title">{title}</div>
      <div className="sb-discover-panel-header-actions">
        {actions}
        {onClose && (
          <button
            type="button"
            className="sb-discover-panel-header-close"
            aria-label={t("close", { defaultValue: "Close" })}
            title={t("close", { defaultValue: "Close" })}
            onClick={onClose}
          >
            <MaterialIcon>close</MaterialIcon>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A Discover sub-view inside the side pane: a `DiscoverPanelHeader` pinned to
 * the top, with `children` scrolling beneath it.
 */
export function DiscoverPanelLayout(
  props: DiscoverPanelHeaderProps & {
    /** Extra classes for the scrolling body, next to `sb-discover-pane`. */
    bodyClassName?: string;
    children: ComponentChildren;
  }
) {
  const { bodyClassName, children, ...header } = props;

  return (
    <div className="sb-discover-panel-layout">
      <DiscoverPanelHeader {...header} />
      <div
        className={`sb-discover-pane sb-discover-panel-layout-body${
          bodyClassName ? ` ${bodyClassName}` : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
