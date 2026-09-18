import "./OfflineDownloadPrompt.css";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { OfflineTranslationsManager } from "../../managers/OfflineTranslationsManager";

/**
 * Offers to update the downloaded translation the reader is currently in, once
 * a newer version has been found while the device wants to save data.
 *
 * The offer itself is decided by {@link OfflineTranslationsManager} — see
 * `checkAndApplyUpdate` — which only shows this when
 * `navigator.connection.saveData` is true; otherwise the update is downloaded
 * without asking and this never renders. Shares its markup and styling with
 * `OfflineDownloadPrompt` since it presents the same kind of choice.
 */
export function OfflineUpdatePrompt({
  offline,
  toast,
  className = "",
}: {
  offline: OfflineTranslationsManager;
  toast: (message: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const translation = offline.updatePrompt.value;

  useEffect(() => {
    if (!translation) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        offline.dismissUpdatePrompt();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [translation]);

  if (!translation) {
    return null;
  }

  const update = async () => {
    offline.dismissUpdatePrompt();

    const succeeded = await offline.downloadTranslation(translation.id);
    if (succeeded) {
      toast(
        t("translation-updated", {
          name: translation.shortName,
          defaultValue: "{{name}} was updated",
        })
      );
      return;
    }

    // A cancelled download reports no error, and there's nothing to tell the
    // user about an update they stopped themselves.
    if (offline.errors.value.get(translation.id)) {
      toast(
        t("translation-update-failed", {
          name: translation.shortName,
          defaultValue: "Couldn't update {{name}}.",
        })
      );
    }
  };

  return (
    <div
      className={`sb-offline-prompt-overlay ${className}`}
      onClick={() => offline.dismissUpdatePrompt()}
    >
      <div
        className="sb-offline-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-offline-update-prompt-title"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <div className="sb-offline-prompt-handle" aria-hidden="true" />

        <div className="sb-offline-prompt-header">
          <div className="sb-offline-prompt-icon" aria-hidden="true">
            <span className="material-symbols-outlined">sync</span>
          </div>

          <h2
            className="sb-offline-prompt-title"
            id="sb-offline-update-prompt-title"
          >
            {t("updatePrompt.title", {
              abbreviation: translation.shortName,
              defaultValue: "Update {{abbreviation}}?",
            })}
          </h2>
        </div>

        <p className="sb-offline-prompt-body">
          {t("updatePrompt.body", {
            name: translation.name,
            defaultValue:
              "A newer version of {{name}} is available. Update your offline copy to keep it current.",
          })}
        </p>

        <button
          type="button"
          className="sb-offline-prompt-btn sb-offline-prompt-btn-primary"
          onClick={() => void update()}
        >
          {t("updatePrompt.update", { defaultValue: "Update" })}
        </button>

        <button
          type="button"
          className="sb-offline-prompt-btn sb-offline-prompt-btn-secondary"
          onClick={() => offline.dismissUpdatePrompt()}
        >
          {t("updatePrompt.notNow", { defaultValue: "Not now" })}
        </button>
      </div>
    </div>
  );
}
