import { useI18n } from "../../i18n/I18nManager";
import {
  estimateTranslationSizeBytes,
  formatBytes,
  type OfflineTranslationsManager,
} from "../../managers/OfflineTranslationsManager";
import { downloadTranslationWithToast } from "./downloadTranslationWithToast";
import { OfflinePromptCard } from "./OfflinePromptCard";

/**
 * Offers to save the translation the reader is currently in for offline use.
 *
 * The offer itself is decided by {@link OfflineTranslationsManager}; this only
 * renders whatever it has put up.
 *
 * Accepting starts the download and closes immediately: live progress belongs
 * to the translation list's own controls, so the user isn't held here watching
 * a bar.
 */
export function OfflineDownloadPrompt({
  offline,
  toast,
  isMobile,
  className,
}: {
  offline: OfflineTranslationsManager;
  toast: (message: string) => void;
  /** Phone-sized screen, where it opens as a bottom sheet. */
  isMobile: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const translation = offline.downloadPrompt.value;

  if (!translation) {
    return null;
  }

  const estimatedBytes = estimateTranslationSizeBytes(translation);

  const save = async () => {
    offline.dismissDownloadPrompt();
    await downloadTranslationWithToast(offline, translation, toast, t);
  };

  return (
    <OfflinePromptCard
      isMobile={isMobile}
      className={className}
      icon="download"
      title={t("offlinePrompt.title", {
        abbreviation: translation.shortName,
        defaultValue: "Save {{abbreviation}} for offline reading?",
      })}
      body={
        estimatedBytes === null
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
            })
      }
      actionLabel={t("offlinePrompt.save", { defaultValue: "Save offline" })}
      onAction={() => void save()}
      dismissLabel={t("offlinePrompt.notNow", { defaultValue: "Not now" })}
      onDismiss={() => offline.dismissDownloadPrompt()}
    />
  );
}
