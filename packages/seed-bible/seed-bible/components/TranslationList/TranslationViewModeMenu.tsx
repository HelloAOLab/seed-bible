import "./TranslationList.css";
import { useI18n } from "../../i18n/I18nManager";
import { SelectedIcon } from "../icons";
import type { TranslationViewMode } from "../../managers/translationGrouping";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Labels are written as literal `t("…")` calls rather than looked up from a
 * key string, so the i18n lint rule can still see the keys as used.
 */
const VIEW_MODES: {
  mode: TranslationViewMode;
  label: (t: Translate) => string;
}[] = [
  {
    mode: "complete",
    label: (t) =>
      t("complete-translations", { defaultValue: "Complete translations" }),
  },
  {
    mode: "all",
    label: (t) => t("all-translations", { defaultValue: "All translations" }),
  },
  {
    mode: "popular",
    label: (t) =>
      t("popular-translations", { defaultValue: "Popular translations" }),
  },
];

/**
 * Chooses how much of the translation catalog the picker shows.
 *
 * Only the options themselves — each surface positions them itself, since the
 * reader anchors this under its modal's filter icon and the Compare pane
 * anchors it under its own.
 */
export function TranslationViewModeMenu(props: {
  viewMode: TranslationViewMode;
  onChange: (mode: TranslationViewMode) => void;
}) {
  const { viewMode, onChange } = props;
  const { t } = useI18n();

  return (
    <div className="sb-translation-view-mode-menu" role="menu">
      {VIEW_MODES.map(({ mode, label }) => {
        const isSelected = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="menuitemradio"
            aria-checked={isSelected}
            className={
              "translation-option flex-between-center-gap-md sb-translation-view-mode-option" +
              (isSelected ? " sb-translation-view-mode-option--selected" : "")
            }
            onClick={() => onChange(mode)}
          >
            <span className="translation-title inline-flex-start-center-gap-sm">
              {isSelected ? (
                <SelectedIcon height={17} width={17} />
              ) : (
                <span className="emptyCircle sb-translation-view-mode-bullet" />
              )}
              <span className="translation-description">{label(t)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
