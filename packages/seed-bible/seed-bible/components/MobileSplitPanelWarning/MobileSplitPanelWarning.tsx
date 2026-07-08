import "./MobileSplitPanelWarning.css";
import { useI18n } from "../../i18n/I18nManager";

interface MobileSplitPanelWarningContentProps {
  /** Collapse the anchored split to a single pane, then open the panel. */
  onCollapse: () => void;
  /** Keep the anchored split and open the panel on top of it. */
  onKeep: () => void;
  /** Dismiss without opening the panel. */
  onCancel: () => void;
}

/**
 * Body of the confirmation shown on mobile when the user opens a detached
 * panel while the anchored layout is already split into two panes. A detached
 * panel renders as a bottom sheet over the anchored panes, so stacking one on
 * top of an existing split is cramped on a small screen. The user chooses to
 * collapse the split first, keep it, or cancel.
 */
export function MobileSplitPanelWarningContent(
  props: MobileSplitPanelWarningContentProps
) {
  const { onCollapse, onKeep, onCancel } = props;
  const { t } = useI18n();

  return (
    <div className="sb-split-panel-warning">
      <p className="sb-split-panel-warning-message">
        {t("split-panel-warning-message", {
          defaultValue:
            "You already have a split layout with two panels. On a small screen, opening another panel on top of them can feel cramped.",
        })}
      </p>
      <div className="sb-split-panel-warning-actions">
        <button
          type="button"
          className="sb-split-panel-warning-button sb-split-panel-warning-button-secondary"
          onClick={onCancel}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-split-panel-warning-button sb-split-panel-warning-button-secondary"
          onClick={onKeep}
        >
          {t("split-panel-warning-keep", { defaultValue: "Keep split" })}
        </button>
        <button
          type="button"
          className="sb-split-panel-warning-button sb-split-panel-warning-button-primary"
          onClick={onCollapse}
        >
          {t("split-panel-warning-collapse", { defaultValue: "Close split" })}
        </button>
      </div>
    </div>
  );
}
