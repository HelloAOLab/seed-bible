import "./SearchClearButton.css";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";

/**
 * The × at the end of a search box that empties it, the same in every search
 * bar. Callers render it only while there's something to clear.
 */
export function SearchClearButton(props: { onClear: () => void }) {
  const { t } = useI18n();
  const label = t("clear-search", { defaultValue: "Clear search" });
  return (
    <button
      type="button"
      className="sb-search-clear-button"
      onClick={props.onClear}
      aria-label={label}
      title={label}
    >
      <MaterialIcon aria-hidden="true">close</MaterialIcon>
    </button>
  );
}
