import "./PaneHeader.css";
import type { ComponentChild } from "preact";
import type { PaneTitle } from "../../managers/PanesManager";
import { useI18n } from "../../i18n/I18nManager";

export interface PaneHeaderProps {
  /**
   * Title shown in the header. Either a plain string, or a render function
   * rendered as a component so it can use hooks (i18n, signals).
   */
  title: PaneTitle;
  /** Called when the close button is pressed. */
  onClose: () => void;
  /**
   * Optional icon rendered before the title. Rendered as a component so it
   * can use hooks.
   */
  icon?: () => ComponentChild;
  /**
   * Optional custom header content rendered between the title and the close
   * button. Rendered as a component so it can use hooks (i18n, signals).
   */
  header?: () => ComponentChild;
  /**
   * Optional pointer-down handler on the header itself (excluding the close
   * button and the custom header slot, which stop propagation). Used by
   * floating panes to start a drag-to-move gesture.
   */
  onPointerDown?: (event: PointerEvent) => void;
}

/**
 * Chrome shown at the top of every pane: a title, an optional caller-provided
 * header slot, and a close button.
 */
export function PaneHeader(props: PaneHeaderProps) {
  const {
    title: Title,
    onClose,
    icon: Icon,
    header: Header,
    onPointerDown,
  } = props;
  const { t } = useI18n();

  return (
    <div className="sb-pane-header" onPointerDown={onPointerDown}>
      <div className="sb-pane-header-title">
        {Icon && (
          <span className="sb-pane-header-icon">
            <Icon />
          </span>
        )}
        <span className="sb-pane-header-title-text">
          {typeof Title === "function" ? <Title /> : Title}
        </span>
      </div>
      {Header && (
        <div
          className="sb-pane-header-actions"
          onPointerDown={(event: PointerEvent) => {
            event.stopPropagation();
          }}
        >
          <Header />
        </div>
      )}
      <button
        className="sb-pane-header-close-button"
        aria-label={t("close", { defaultValue: "Close" })}
        title={t("close", { defaultValue: "Close" })}
        onPointerDown={(event: PointerEvent) => {
          event.stopPropagation();
        }}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <span className="material-symbols-outlined">close</span>
        <span className="sr-only">{t("close", { defaultValue: "Close" })}</span>
      </button>
    </div>
  );
}
