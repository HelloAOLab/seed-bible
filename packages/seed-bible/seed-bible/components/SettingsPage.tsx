import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { TextSize } from "seed-bible.managers.ConfigManager";
import {
  ExtensionInitalizer,
  type ExtensionSet,
} from "seed-bible.managers.ExtensionManager";
import { useI18n } from "seed-bible.i18n.I18nManager";

type SettingsView = null | "account" | "theme" | "extensions";

type ExtensionInstallState = "none" | "pending" | "downloaded" | "installed";

const FONT_SIZE_OPTIONS: TextSize[] = ["XS", "S", "M", "L", "XL", "XXL"];

function parseFontSize(value: string, fallback: TextSize): TextSize {
  return FONT_SIZE_OPTIONS.includes(value as TextSize)
    ? (value as TextSize)
    : fallback;
}

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
  const { config, setFontSize } = state.config;
  const selectedFontSize = config.value.fontSize;

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

        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-font-size-select"
          >
            Font size
          </label>
          <select
            id="sb-font-size-select"
            className="sb-settings-language-select"
            value={selectedFontSize}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              setFontSize(parseFontSize(target.value, selectedFontSize));
            }}
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}

function getExtensionInstallState(
  installed: boolean,
  pendingInstallation: boolean,
  isRegistered: boolean
): ExtensionInstallState {
  if (pendingInstallation) {
    return "pending";
  }
  if (installed && isRegistered) {
    return "installed";
  }
  if (installed && !isRegistered) {
    return "downloaded";
  }
  return "none";
}

function ExtensionsSettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { extensions } = state;
  const extensionsList = extensions.getExtensions();
  const installingIds = useSignal<Set<string>>(new Set());
  const openMenuId = useSignal<string | null>(null);
  const isDownloadingSet = useSignal(false);
  const isUploadingSet = useSignal(false);

  const handleInstall = async (extensionId: string) => {
    openMenuId.value = null;
    const extensionData = extensionsList.find(
      (e) => e.extension?.meta.id === extensionId
    );
    if (!extensionData || !extensionData.extension) return;

    installingIds.value = new Set(installingIds.value).add(extensionId);
    await extensions.loadExtension(extensionData.extension);
    installingIds.value = new Set(
      [...installingIds.value].filter((id) => id !== extensionId)
    );
  };

  const handleUninstall = (extensionId: string) => {
    openMenuId.value = null;
    extensions.unloadExtension(extensionId);
  };

  const handleDownloadExtensions = async () => {
    if (isDownloadingSet.value) {
      return;
    }

    isDownloadingSet.value = true;
    try {
      const set = extensions.getAllExtensionsAsSet();
      if (!set) {
        return;
      }
      os.download(set, `${set.id}.json`, "application/json");
    } finally {
      isDownloadingSet.value = false;
    }
  };

  const handleUploadExtensions = async () => {
    if (isUploadingSet.value) {
      return;
    }

    isUploadingSet.value = true;
    try {
      const files = await os.showUploadFiles();
      const firstFile = files?.[0];
      if (!firstFile) {
        return;
      }

      const text =
        typeof firstFile.data === "string"
          ? firstFile.data
          : new TextDecoder().decode(firstFile.data);

      const parsed = JSON.parse(text) as Partial<{
        id: unknown;
        recordName: unknown;
        extensions: unknown;
      }>;

      if (
        typeof parsed.id !== "string" ||
        typeof parsed.recordName !== "string" ||
        !Array.isArray(parsed.extensions)
      ) {
        console.error("Uploaded file is not a valid extension set.");
        return;
      }

      await extensions.loadExtensionSet(parsed as ExtensionSet, () => false);
    } catch (error) {
      console.error("Failed to upload extension set.", error);
    } finally {
      isUploadingSet.value = false;
    }
  };

  return (
    <div className="sb-settings-page">
      <SettingsSubPageHeader title="Extensions" onBack={onBack} />
      <section className="sb-settings-section">
        {extensionsList.length === 0 ? (
          <div className="sb-settings-empty-state">
            <p>No extensions available.</p>
          </div>
        ) : (
          <ul className="sb-extensions-list">
            {extensionsList.map((extensionEntry) => {
              const { id, extension, installed, pendingInstallation } =
                extensionEntry;
              const isRegistered =
                ExtensionInitalizer.getInstance().isExtensionRegistered(id);
              const installState = getExtensionInstallState(
                installed,
                pendingInstallation,
                isRegistered
              );

              const stateIcon =
                installState === "installed"
                  ? "check_circle"
                  : installState === "downloaded"
                    ? "download_done"
                    : installState === "pending"
                      ? "downloading"
                      : "extension";

              const stateLabel =
                installState === "installed"
                  ? "Installed"
                  : installState === "downloaded"
                    ? "Downloaded"
                    : installState === "pending"
                      ? "Installing…"
                      : "Not installed";

              return (
                <li key={id} className="sb-extension-row">
                  <button className="sb-extension-row-button" disabled>
                    <span
                      className={`material-symbols-outlined sb-extension-state-icon sb-extension-state-${installState}`}
                      title={stateLabel}
                    >
                      {stateIcon}
                    </span>
                    <div className="sb-extension-row-content">
                      <span className="sb-extension-name">
                        {extension?.meta.titles.en ?? id}
                      </span>
                      <span className="sb-extension-description">
                        {extension?.meta.descriptions.en ?? ""}
                      </span>
                    </div>
                  </button>

                  <div className="sb-extension-menu-anchor">
                    <button
                      className="sb-extension-menu-button"
                      aria-label="Extension options"
                      title="Extension options"
                      onClick={() => {
                        openMenuId.value = openMenuId.value === id ? null : id;
                      }}
                    >
                      <span className="material-symbols-outlined sb-extension-more-icon">
                        more_vert
                      </span>
                    </button>

                    {openMenuId.value === id && (
                      <div className="sb-extension-menu">
                        {installState === "none" && (
                          <button
                            className="sb-extension-menu-item"
                            onClick={() => void handleInstall(id)}
                          >
                            Install
                          </button>
                        )}
                        {(installState === "installed" ||
                          installState === "downloaded") && (
                          <button
                            className="sb-extension-menu-item"
                            onClick={() => handleUninstall(id)}
                          >
                            Uninstall
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="sb-extension-footer-actions">
          <button
            className="sb-settings-action-button"
            onClick={() => void handleDownloadExtensions()}
            disabled={isDownloadingSet.value}
          >
            {isDownloadingSet.value
              ? "Downloading Extensions..."
              : "Download Extensions"}
          </button>
          <button
            className="sb-settings-action-button"
            onClick={() => void handleUploadExtensions()}
            disabled={isUploadingSet.value}
          >
            {isUploadingSet.value
              ? "Uploading Extensions..."
              : "Upload Extensions"}
          </button>
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
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("extensions")}
            >
              <span>Extensions</span>
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

  if (currentView.value === "extensions") {
    return (
      <ExtensionsSettingsView
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
