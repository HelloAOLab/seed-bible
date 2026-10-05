import "./OfflineDownloadPrompt.css";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import {
  estimateTranslationSizeBytes,
  formatBytes,
  type OfflineTranslationsManager,
} from "../../managers/OfflineTranslationsManager";

/**
 * Offers to save the translation the reader is currently in for offline use.
 *
 * The offer itself is decided by {@link OfflineTranslationsManager}; this only
 * renders whatever it has put up. A centered dialog on desktop and a bottom
 * sheet on narrow screens — the same markup either way, switched in CSS.
 *
 * Accepting starts the download and closes immediately: live progress belongs
 * to the translation list's own controls, so the user isn't held here watching
 * a bar.
 */
export function OfflineDownloadPrompt({
  offline,
  toast,
  className = "",
}: {
  offline: OfflineTranslationsManager;
  toast: (message: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const translation = offline.downloadPrompt.value;

  useEffect(() => {
    if (!translation) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        offline.dismissDownloadPrompt();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [translation]);

  if (!translation) {
    return null;
  }

  const estimatedBytes = estimateTranslationSizeBytes(translation);

  const save = async () => {
    offline.dismissDownloadPrompt();

    const succeeded = await offline.downloadTranslation(translation.id);
    if (succeeded) {
      toast(
        t("translation-downloaded", {
          name: translation.shortName,
          defaultValue: "{{name}} is now available offline",
        })
      );
      return;
    }

    // A cancelled download reports no error, and there's nothing to tell the
    // user about a download they stopped themselves.
    if (offline.errors.value.get(translation.id)) {
      toast(
        t("translation-download-failed", {
          name: translation.shortName,
          defaultValue: "Couldn't download {{name}}.",
        })
      );
    }
  };

  return (
    <div
      className={`sb-offline-prompt-overlay ${className}`}
      onClick={() => offline.dismissDownloadPrompt()}
    >
      <div
        className="sb-offline-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-offline-prompt-title"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <div className="sb-offline-prompt-handle" aria-hidden="true" />

        <div className="sb-offline-prompt-header">
          <div className="sb-offline-prompt-icon" aria-hidden="true">
            <span className="material-symbols-outlined">download</span>
          </div>

          <h2 className="sb-offline-prompt-title" id="sb-offline-prompt-title">
            {t("offlinePrompt.title", {
              abbreviation: translation.shortName,
              defaultValue: "Save {{abbreviation}} for offline reading?",
            })}
          </h2>
        </div>

        <p className="sb-offline-prompt-body">
          {estimatedBytes === null
            ? t("offlinePrompt.bodyNoSize", {
                name: translation.name,
                defaultValue:
                  "Keep {{name}} on your device so you can read it without a connection.",
              })
            : t("offlinePrompt.body", {
                name: translation.name,
                size: formatBytes(estimatedBytes),
                defaultValue:
                  "Keep {{name}} on your device so you can read it without a connection. About {{size}}.",
              })}
        </p>

        <button
          type="button"
          className="sb-offline-prompt-btn sb-offline-prompt-btn-primary"
          onClick={() => void save()}
        >
          {t("offlinePrompt.save", { defaultValue: "Save offline" })}
        </button>

        <button
          type="button"
          className="sb-offline-prompt-btn sb-offline-prompt-btn-secondary"
          onClick={() => offline.dismissDownloadPrompt()}
        >
          {t("offlinePrompt.notNow", { defaultValue: "Not now" })}
        </button>
      </div>
    </div>
  );
}
