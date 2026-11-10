import "./AnnotationOverrideBanner.css";
import { useI18n } from "../../i18n/I18nManager";

/**
 * Shown atop the notes section whenever annotations are being routed through
 * a `recordOverride` (the `annotationRecordKey` URL param) instead of the
 * signed-in account's own record — e.g. a Codex-published translation being
 * annotated through its team's shared record. The button drops that query
 * param and reloads, since the override is only read once at app startup
 * (see `SeedBibleStateManager`) and can't be switched off by a soft
 * navigation.
 *
 * Loaded lazily from `DiscoverPane` (see its `AnnotationOverrideBanner` lazy
 * import) so this component and its CSS stay out of the core bundle,
 * fetched only when a visitor actually has an override active.
 */
export default function AnnotationOverrideBanner() {
  const { t } = useI18n();

  const saveToMyAccount = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("annotationRecordKey");
    window.location.href = url.toString();
  };

  return (
    <div className="sb-annotation-override-banner">
      <span className="sb-annotation-override-banner-text">
        {t("annotation-override-banner", {
          defaultValue:
            "Notes are being saved and loaded from your team's account.",
        })}
      </span>
      <button
        type="button"
        className="sb-annotation-override-banner-button"
        onClick={saveToMyAccount}
      >
        {t("annotation-override-save-to-my-account", {
          defaultValue: "Save to my account",
        })}
      </button>
    </div>
  );
}
