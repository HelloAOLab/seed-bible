import "./OfflineRecoveryToast.css";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { OfflineTranslationsManager } from "../../managers/OfflineTranslationsManager";
import { downloadTranslationWithToast } from "./downloadTranslationWithToast";

/**
 * Suggests saving the translation for offline reading once a chapter that
 * failed to load has come back on a retry, so the next dropped connection
 * doesn't leave the reader stuck again.
 *
 * A small card pinned to a corner rather than a dialog: the reader has just
 * got their chapter back, and this shouldn't stand between them and it.
 * Whether it shows is decided by {@link OfflineTranslationsManager}.
 */
export function OfflineRecoveryToast({
  offline,
  toast,
  className = "",
}: {
  offline: OfflineTranslationsManager;
  toast: (message: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const translation = offline.recoveryPrompt.value;

  useEffect(() => {
    if (!translation) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        offline.dismissRecoveryPrompt();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [translation]);

  if (!translation) {
    return null;
  }

  const save = async () => {
    offline.dismissRecoveryPrompt();
    await downloadTranslationWithToast(offline, translation, toast, t);
  };

  return (
    <div
      className={`sb-offline-recovery ${className}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="sb-offline-recovery-title"
    >
      <h3 className="sb-offline-recovery-title" id="sb-offline-recovery-title">
        {t("offlineRecovery.title", {
          abbreviation: translation.shortName,
          defaultValue: "Save {{abbreviation}} for offline reading?",
        })}
      </h3>
      <p className="sb-offline-recovery-body">
        {t("offlineRecovery.body", {
          defaultValue:
            "That chapter didn't load the first time. With a download, you can keep reading even when your connection drops.",
        })}
      </p>
      <div className="sb-offline-recovery-actions">
        <button
          type="button"
          className="sb-offline-recovery-btn sb-offline-recovery-btn-secondary"
          onClick={() => offline.dismissRecoveryPrompt()}
        >
          {t("offlineRecovery.notNow", { defaultValue: "Not now" })}
        </button>
        <button
          type="button"
          className="sb-offline-recovery-btn sb-offline-recovery-btn-primary"
          onClick={() => void save()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            download
          </span>
          {t("offlineRecovery.download", { defaultValue: "Download" })}
        </button>
      </div>
    </div>
  );
}
