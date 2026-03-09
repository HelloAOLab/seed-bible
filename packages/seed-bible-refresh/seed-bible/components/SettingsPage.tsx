import { useTheme } from "seed-bible.managers.ThemeManager";

export function SettingsPage() {
  const { themes, selectedThemeId, setTheme } = useTheme();

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
      </section>
    </div>
  );
}
