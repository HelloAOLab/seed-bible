import type { I18nHook } from "../../i18n/I18nManager";
import type { Translation } from "../../managers/FreeUseBibleAPI";
import type { OfflineTranslationsManager } from "../../managers/OfflineTranslationsManager";

/**
 * Downloads a translation for offline reading and tells the user how it went.
 * Resolves to whether the translation is now stored on the device.
 */
export async function downloadTranslationWithToast(
  offline: OfflineTranslationsManager,
  translation: Translation,
  toast: (message: string) => void,
  t: I18nHook["t"]
): Promise<boolean> {
  const succeeded = await offline.downloadTranslation(translation.id);
  if (succeeded) {
    toast(
      t("translation-downloaded", {
        name: translation.shortName,
        defaultValue: "{{name}} is now available offline",
      })
    );
    return true;
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
  return false;
}
