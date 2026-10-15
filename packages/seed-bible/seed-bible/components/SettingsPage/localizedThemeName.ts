import type { I18nHook } from "../../i18n/I18nManager";
import {
  DARK_THEME,
  LIGHT_THEME,
  SYSTEM_THEME_ID,
} from "../../managers/ThemeManager";

/**
 * Built-in theme names are authored in English on the theme object, so they'd
 * otherwise render untranslated. Spelled out as separate `t()` calls (rather
 * than a computed `theme-${id}` key) so the i18n lint rules can see them.
 * User-supplied themes keep whatever name they were given.
 */
export function localizedThemeName(
  t: I18nHook["t"],
  theme: { id: string; name: string }
): string {
  if (theme.id === LIGHT_THEME.id) {
    return t("theme-light", { defaultValue: theme.name });
  }
  if (theme.id === DARK_THEME.id) {
    return t("theme-dark", { defaultValue: theme.name });
  }
  if (theme.id === SYSTEM_THEME_ID) {
    return t("theme-system", { defaultValue: theme.name });
  }
  return theme.name;
}
