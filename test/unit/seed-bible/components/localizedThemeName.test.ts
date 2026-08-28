import { localizedThemeName } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import type { I18nHook } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

/**
 * Stands in for i18next: returns the translation when the active language has
 * one, and otherwise falls back to the `defaultValue` the caller supplied —
 * which is how the real `t` behaves for a key a locale hasn't translated yet.
 */
function createT(translations: Record<string, string> = {}): I18nHook["t"] {
  return ((key: string, options?: { defaultValue?: string }) =>
    translations[key] ?? options?.defaultValue ?? key) as I18nHook["t"];
}

describe("localizedThemeName", () => {
  it("returns the translated name for the built-in light theme", () => {
    const t = createT({ "theme-light": "فاتح" });

    expect(localizedThemeName(t, { id: "light", name: "Light" })).toBe("فاتح");
  });

  it("returns the translated name for the built-in dark theme", () => {
    const t = createT({ "theme-dark": "داكن" });

    expect(localizedThemeName(t, { id: "dark", name: "Dark" })).toBe("داكن");
  });

  it("falls back to the theme's English name when the locale has no translation", () => {
    const t = createT();

    expect(localizedThemeName(t, { id: "light", name: "Light" })).toBe("Light");
    expect(localizedThemeName(t, { id: "dark", name: "Dark" })).toBe("Dark");
  });

  it("leaves a user-supplied theme name untouched", () => {
    const t = createT({ "theme-light": "فاتح", "theme-dark": "داكن" });

    expect(localizedThemeName(t, { id: "sepia-custom", name: "Sepia" })).toBe(
      "Sepia"
    );
  });
});
