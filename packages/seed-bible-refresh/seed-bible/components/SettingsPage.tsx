import { createTheme } from "seed-bible.managers.ThemeManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { useI18n } from "seed-bible.i18n.I18nManager";

export function SettingsPage(props: { state: SeedBibleState }) {
  const { state } = props;
  const { config, setDisablePanels } = state.config;
  const { themes, selectedThemeId, setTheme } = createTheme();
  const { language, availableLanguages, setLanguage } = useI18n();

  return (
    <div className="sb-settings-page">
      <section className="sb-settings-section">
        <h2 className="sb-settings-title">Theme & text</h2>
        <div className="sb-settings-theme-options">
          {themes.value.map((theme) => {
            const isSelected = theme.id === selectedThemeId.value;
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`sb-settings-theme-button${
                  isSelected ? " sb-settings-theme-button-selected" : ""
                }`}
              >
                {theme.name}
              </button>
            );
          })}
        </div>

        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-language-select"
          >
            Language
          </label>
          <select
            id="sb-language-select"
            className="sb-settings-language-select"
            value={language}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              void setLanguage(target.value);
            }}
          >
            {availableLanguages.map((languageCode) => (
              <option key={languageCode} value={languageCode}>
                {languageCode.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-disable-panels-toggle"
          >
            Disable panels
          </label>
          <input
            id="sb-disable-panels-toggle"
            type="checkbox"
            checked={config.value.disablePanels}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              setDisablePanels(target.checked);
            }}
          />
        </div>
      </section>
    </div>
  );
}
