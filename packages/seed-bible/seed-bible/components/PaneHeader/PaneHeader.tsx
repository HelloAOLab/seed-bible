import "./PaneHeader.css";
import type { ComponentChild } from "preact";
import { useI18n } from "../../i18n/I18nManager";

export interface PaneHeaderProps {
  /** Title shown in the header. */
  title: string;
  /** Called when the close button is pressed. */
  onClose: () => void;
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
  const { title, onClose, header: Header, onPointerDown } = props;
  const { t } = useI18n();

  return (
    <div className="sb-pane-header" onPointerDown={onPointerDown}>
      <div className="sb-pane-header-title">{title}</div>
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
