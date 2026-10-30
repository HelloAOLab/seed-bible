import { useI18n } from "../../i18n";

/** Closes Today. Its pane has no header bar, so this is the way out. */
export function TodayCloseButton(props: { onClose: () => void }) {
  const { t } = useI18n();
  const label = t("close", { defaultValue: "Close" });
  return (
    <button
      type="button"
      className="sb-today-close-button"
      onClick={props.onClose}
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        close
      </span>
    </button>
  );
}
