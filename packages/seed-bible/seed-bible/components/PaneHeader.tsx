import { useI18n } from "../i18n/I18nManager";

export interface PaneHeaderProps {
  /** Title shown in the header. */
  title: string;
  /** Called when the close button is pressed. */
  onClose: () => void;
  /**
   * Optional pointer-down handler on the header itself (excluding the close
   * button, which stops propagation). Used by floating panes to start a
   * drag-to-move gesture.
   */
  onPointerDown?: (event: PointerEvent) => void;
}

/**
 * Chrome shown at the top of every pane: a title and a close button, nothing
 * else.
 */
export function PaneHeader(props: PaneHeaderProps) {
  const { title, onClose, onPointerDown } = props;
  const { t } = useI18n();

  return (
    <div className="sb-pane-header" onPointerDown={onPointerDown}>
      <div className="sb-pane-header-title">{title}</div>
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
