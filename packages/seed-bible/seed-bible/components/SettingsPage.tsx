import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { useI18n } from "seed-bible.i18n.I18nManager";

type SettingsView = null | "account" | "theme";

function SettingsSubPageHeader(props: { title: string; onBack: () => void }) {
  return (
    <div className="sb-settings-subpage-header">
      <button
        className="sb-settings-back-button"
        onClick={props.onBack}
        aria-label="Back to settings"
        title="Back"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <h2 className="sb-settings-subpage-title">{props.title}</h2>
    </div>
  );
}

function AccountSettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { login } = state;
  const isLoggedIn = login.userId.value !== null;
  const profile = login.profile.value;

  const name = useSignal(profile?.name ?? "");
  const location = useSignal(profile?.location ?? "");

  const handleSave = () => {
    login.updateProfile({
      name: name.value,
      location: location.value || null,
    });
  };

  return (
    <div className="sb-settings-page">
      <SettingsSubPageHeader title="Account settings" onBack={onBack} />
      <section className="sb-settings-section">
        {isLoggedIn ? (
          <>
            <div className="sb-settings-field-row">
              <label
                className="sb-settings-field-label"
                htmlFor="sb-profile-name"
              >
                Name
              </label>
              <input
                id="sb-profile-name"
                className="sb-settings-text-input"
                type="text"
                value={name.value}
                onInput={(event: Event) => {
                  name.value = (event.currentTarget as HTMLInputElement).value;
                }}
                placeholder="Your name"
              />
            </div>
            <div className="sb-settings-field-row">
              <label
                className="sb-settings-field-label"
                htmlFor="sb-profile-location"
              >
                Location
              </label>
              <input
                id="sb-profile-location"
                className="sb-settings-text-input"
                type="text"
                value={location.value ?? ""}
                onInput={(event: Event) => {
                  location.value = (
                    event.currentTarget as HTMLInputElement
                  ).value;
                }}
                placeholder="Your location"
              />
            </div>
            <div className="sb-settings-actions">
              <button className="sb-settings-save-button" onClick={handleSave}>
                Save
              </button>
            </div>
          </>
        ) : (
          <div className="sb-settings-login-prompt">
            <p>Please log in to view and edit your profile.</p>
            <button
              className="sb-settings-action-button"
              onClick={() => void login.login()}
            >
              Log in
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ThemeSettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { themes, selectedThemeId, setTheme } = state.theme;

  return (
    <div className="sb-settings-page">
      <SettingsSubPageHeader title="Theme & text" onBack={onBack} />
      <section className="sb-settings-section">
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

function SettingsMainView(props: {
  state: SeedBibleState;
  onNavigate: (view: SettingsView) => void;
}) {
  const { onNavigate } = props;
  const { language, availableLanguages, setLanguage } = useI18n();
  const isAwake = useSignal(false);

  const handleWakeLockToggle = (checked: boolean) => {
    isAwake.value = checked;
    if (checked) {
      void os.requestWakeLock();
    } else {
      void os.disableWakeLock();
    }
  };

  return (
    <div className="sb-settings-page">
      <section className="sb-settings-section">
        <h2 className="sb-settings-title">General Settings</h2>
        <ul className="sb-settings-list">
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("account")}
            >
              <span>Account settings</span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("theme")}
            >
              <span>Theme & text</span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <div className="sb-settings-toggle-row">
              <label
                className="sb-settings-toggle-label"
                htmlFor="sb-wake-lock-toggle"
              >
                Keep screen awake
              </label>
              <input
                id="sb-wake-lock-toggle"
                type="checkbox"
                checked={isAwake.value}
                onChange={(event: Event) => {
                  handleWakeLockToggle(
                    (event.currentTarget as HTMLInputElement).checked
                  );
                }}
              />
            </div>
          </li>
          <li>
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
          </li>
          <li>
            <button
              className="sb-settings-action-button"
              onClick={() => {
                window.open(
                  "https://docs.google.com/forms/d/e/1FAIpQLSejiuVM8xguEHKZ2Kv5DX-jE98zYwxFiPwpYrFSmvVgMejZzQ/viewform",
                  "_blank"
                );
              }}
            >
              Report a bug
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}

export function SettingsPage(props: { state: SeedBibleState }) {
  const { state } = props;
  const currentView = useSignal<SettingsView>(null);

  if (currentView.value === "account") {
    return (
      <AccountSettingsView
        state={state}
        onBack={() => {
          currentView.value = null;
        }}
      />
    );
  }

  if (currentView.value === "theme") {
    return (
      <ThemeSettingsView
        state={state}
        onBack={() => {
          currentView.value = null;
        }}
      />
    );
  }

  return (
    <SettingsMainView
      state={state}
      onNavigate={(view) => {
        currentView.value = view;
      }}
    />
  );
}
