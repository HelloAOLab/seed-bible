import { useI18n } from "../../i18n/I18nManager";
import type { OfflineTranslationsManager } from "../../managers/OfflineTranslationsManager";
import { OfflinePromptCard } from "./OfflinePromptCard";

/**
 * Offers to update the downloaded translation the reader is currently in, once
 * a newer version has been found while the device wants to save data.
 *
 * The offer itself is decided by {@link OfflineTranslationsManager} — see
 * `checkAndApplyUpdate` — which only shows this when
 * `navigator.connection.saveData` is true; otherwise the update is downloaded
 * without asking and this never renders. The same card as
 * `OfflineDownloadPrompt`, since it presents the same kind of choice.
 */
export function OfflineUpdatePrompt({
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
  const translation = offline.updatePrompt.value;

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
    <OfflinePromptCard
      isMobile={isMobile}
      className={className}
      icon="sync"
      title={t("updatePrompt.title", {
        abbreviation: translation.shortName,
        defaultValue: "Update {{abbreviation}}?",
      })}
      body={t("updatePrompt.body", {
        name: translation.name,
        defaultValue:
          "A newer version of {{name}} is available. Update your offline copy to keep it current.",
      })}
      actionLabel={t("updatePrompt.update", { defaultValue: "Update" })}
      onAction={() => void update()}
      dismissLabel={t("updatePrompt.notNow", { defaultValue: "Not now" })}
      onDismiss={() => offline.dismissUpdatePrompt()}
    />
  );
}
