import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { TextSize } from "seed-bible.managers.ConfigManager";
import {
  TEXT_FONT_OPTIONS,
  TEXT_SECTION_THEME_COLOR_VAR,
  TEXT_WEIGHT_OPTIONS,
  UI_TEXT_SIZE_OPTIONS,
  VERSE_LINE_HEIGHT_OPTIONS,
  DEFAULT_VERSE_LINE_HEIGHT,
  type BookOrientation,
  type TextAlignment,
  type TextSectionConfig,
  type TextSectionId,
  type UITextSize,
} from "seed-bible.managers.SettingsManager";
import {
  DEFAULT_HIGHLIGHT_IDS,
  THEME_COLOR_GROUPS,
  type ThemeColorKey,
} from "seed-bible.managers.ThemeManager";
import { translateTitle } from "seed-bible.components.Utils";
import {
  ExtensionInitalizer,
  type ExtensionSet,
} from "seed-bible.managers.ExtensionManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "seed-bible.components.ContextMenu";
import {
  ExtensionsIcon,
  MarginIcon,
  MaterialIcon,
  TheNewSettingsIcon,
  ThemeIcon,
} from "seed-bible.components.icons";

type SettingsView =
  | null
  | "account"
  | "theme"
  | "all-settings"
  | "toolbar"
  | "extensions"
  | "display";

const TEXT_SECTION_ORDER: TextSectionId[] = ["bookTitle", "heading", "verse"];

const ALIGNMENT_CYCLE: Record<TextAlignment, TextAlignment> = {
  left: "center",
  center: "right",
  right: "left",
};

const ALIGNMENT_ICON: Record<TextAlignment, string> = {
  left: "format_align_left",
  center: "format_align_center",
  right: "format_align_right",
};

const TEXT_COLOR_PALETTE = [
  "#000000",
  "#4B5563",
  "#9CA3AF",
  "#D1D5DB",
  "#FFFFFF",
  "#DC2626",
  "#F97316",
  "#FACC15",
  "#16A34A",
  "#0EA5E9",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F43F5E",
];

const HEX_6 = /^#[0-9a-fA-F]{6}$/;

const LANG_META: Record<string, { cc: string; display: string }> = {
  am: { cc: "et", display: "Amharic" },
  ar: { cc: "sa", display: "Arabic" },
  bn: { cc: "bd", display: "Bengali" },
  zh: { cc: "cn", display: "Chinese" },
  en: { cc: "us", display: "English – US" },
  fr: { cc: "fr", display: "French" },
  hi: { cc: "in", display: "Hindi – हिन्दी" },
  iid: { cc: "id", display: "Indonesian" },
  ja: { cc: "jp", display: "Japanese" },
  ko: { cc: "kr", display: "Korean" },
  mn: { cc: "mn", display: "Mongolian" },
  ne: { cc: "np", display: "Nepali" },
  ps: { cc: "af", display: "Pashto" },
  fa: { cc: "ir", display: "Persian" },
  pt: { cc: "br", display: "Portuguese" },
  ru: { cc: "ru", display: "Russian" },
  es: { cc: "es", display: "Spanish" },
  sw: { cc: "tz", display: "Swahili" },
  ti: { cc: "er", display: "Tigrinya" },
  tr: { cc: "tr", display: "Turkish" },
  uk: { cc: "ua", display: "Ukrainian" },
  ur: { cc: "pk", display: "Urdu" },
  ug: { cc: "cn", display: "Uyghur" },
  vi: { cc: "vn", display: "Vietnamese" },
  de: { cc: "de", display: "German" },
};

function FlagImg({ cc }: { cc: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      alt=""
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}
const HEX_3 = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;

/** Normalize an arbitrary color string to #RRGGBB for `<input type="color">`. */
function toHexInputValue(value: string | null | undefined): string {
  if (!value) return "#000000";
  const trimmed = value.trim();
  if (HEX_6.test(trimmed)) return trimmed.toLowerCase();
  const m = trimmed.match(HEX_3);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toLowerCase();
  return "#000000";
}

type ExtensionInstallState = "none" | "pending" | "downloaded" | "installed";

const FONT_SIZE_OPTIONS: TextSize[] = ["XS", "S", "M", "L", "XL", "XXL"];

function SettingsBreadcrumbs(props: { onBack: () => void; trail: string[] }) {
  const { t } = useI18n();
  return (
    <div className="sb-settings-breadcrumbs">
      <button
        className="sb-settings-breadcrumbs-back"
        onClick={props.onBack}
        aria-label={t("back", { defaultValue: "Back" })}
        title={t("back", { defaultValue: "Back" })}
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      {props.trail.map((item, index) => (
        <span key={index} className="sb-settings-breadcrumbs-item">
          {index > 0 && (
            <span className="material-symbols-outlined sb-settings-breadcrumbs-sep">
              chevron_right
            </span>
          )}
          <span
            className={`sb-settings-breadcrumbs-text${
              index === props.trail.length - 1
                ? " sb-settings-breadcrumbs-current"
                : ""
            }`}
          >
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}

function SettingsHero(props: {
  icon: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="sb-settings-hero">
      <div className="sb-settings-hero-title">
        <span
          className="material-symbols-outlined sb-settings-hero-icon"
          aria-hidden="true"
        >
          {props.icon}
        </span>
        <h1 className="sb-settings-hero-text">{props.title}</h1>
      </div>
      {props.description && (
        <p className="sb-settings-hero-description">{props.description}</p>
      )}
    </div>
  );
}

function AccountSettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { login } = state;
  const { t } = useI18n();
  const isLoggedIn = login.userId.value !== null;
  const profile = login.profile.value;

  const name = useSignal(profile?.name ?? "");
  const location = useSignal(profile?.location ?? "");
  const description = useSignal(profile?.description ?? "");
  const pictureUrl = useSignal(profile?.pictureUrl ?? "");
  const isUploadingPicture = useSignal(false);
  const uidCopied = useSignal(false);

  const handleSave = () => {
    login.updateProfile({
      name: name.value,
      location: location.value || null,
      description: description.value || null,
      pictureUrl: pictureUrl.value || null,
    });
  };

  const handleUploadPicture = async () => {
    if (isUploadingPicture.value) {
      return;
    }
    isUploadingPicture.value = true;
    try {
      await login.uploadProfilePicture();
      pictureUrl.value = login.profile.value?.pictureUrl ?? pictureUrl.value;
    } catch (error) {
      console.error("Failed to upload profile picture.", error);
    } finally {
      isUploadingPicture.value = false;
    }
  };

  const handleCopyUserId = async () => {
    const id = login.userId.value;
    if (!id) {
      return;
    }

    try {
      os.setClipboard(id);
      uidCopied.value = true;
      setTimeout(() => {
        uidCopied.value = false;
      }, 1200);
    } catch (error) {
      console.error("Failed to copy user ID.", error);
    }
  };

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("account-settings", { defaultValue: "Account settings" }),
        ]}
      />
      <section className="sb-settings-section">
        {isLoggedIn ? (
          <div className="sb-account-settings-layout">
            <p className="sb-account-settings-intro">
              {t("account-settings-intro", {
                defaultValue: "Manage your profile information here",
              })}
            </p>

            <div className="sb-account-picture-row">
              {pictureUrl.value ? (
                <img
                  className="sb-account-picture-preview"
                  src={pictureUrl.value}
                  alt={t("profile-picture", {
                    defaultValue: "Profile picture",
                  })}
                />
              ) : (
                <div
                  className="sb-account-picture-placeholder"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">person</span>
                </div>
              )}
              <button
                className="sb-account-picture-button"
                onClick={() => void handleUploadPicture()}
                disabled={isUploadingPicture.value}
              >
                {isUploadingPicture.value
                  ? t("uploading", { defaultValue: "Uploading..." })
                  : t("update-picture", { defaultValue: "Update picture" })}
              </button>
            </div>

            <div className="sb-settings-field-row">
              <label
                className="sb-settings-field-label"
                htmlFor="sb-profile-name"
              >
                {t("profile-name", { defaultValue: "Profile name" })}
              </label>
              <input
                id="sb-profile-name"
                className="sb-settings-text-input sb-account-text-input"
                type="text"
                value={name.value}
                onInput={(event: Event) => {
                  name.value = (event.currentTarget as HTMLInputElement).value;
                }}
                placeholder={t("profile-name-placeholder", {
                  defaultValue: "e.g Craig family",
                })}
              />
              <p className="sb-account-field-helper">
                {t("profile-name-helper", {
                  defaultValue: "You can change this later",
                })}
              </p>
            </div>
            <div className="sb-settings-field-row">
              <label
                className="sb-settings-field-label"
                htmlFor="sb-profile-description"
              >
                {t("description", { defaultValue: "Description" })}{" "}
                <span className="sb-account-label-optional">
                  {t("optional", { defaultValue: "(Optional)" })}
                </span>
              </label>
              <textarea
                id="sb-profile-description"
                className="sb-settings-text-input sb-settings-textarea sb-account-textarea"
                value={description.value ?? ""}
                maxLength={300}
                onInput={(event: Event) => {
                  description.value = (
                    event.currentTarget as HTMLTextAreaElement
                  ).value;
                }}
                placeholder={t("description-placeholder", {
                  defaultValue: "Enter your profile description...",
                })}
              />
            </div>
            <div className="sb-settings-field-row">
              <label
                className="sb-settings-field-label"
                htmlFor="sb-profile-location"
              >
                {t("location", { defaultValue: "Location" })}{" "}
                <span className="sb-account-label-optional">
                  {t("optional", { defaultValue: "(Optional)" })}
                </span>
              </label>
              <input
                id="sb-profile-location"
                className="sb-settings-text-input sb-account-text-input"
                type="text"
                value={location.value ?? ""}
                onInput={(event: Event) => {
                  location.value = (
                    event.currentTarget as HTMLInputElement
                  ).value;
                }}
                placeholder={t("location-placeholder", {
                  defaultValue: "e.g Austin,TX",
                })}
              />
            </div>

            <div className="sb-settings-field-row">
              <label className="sb-settings-field-label">
                {t("your-id-is", { defaultValue: "Your ID is:" })}
              </label>
              <div className="sb-account-uid-row">
                <span
                  className="sb-account-uid-value"
                  title={login.userId.value ?? ""}
                >
                  {login.userId.value}
                </span>
                <button
                  type="button"
                  className="sb-account-copy-uid-button"
                  onClick={() => void handleCopyUserId()}
                  aria-label={t("copy-user-id", {
                    defaultValue: "Copy user ID",
                  })}
                  title={
                    uidCopied.value
                      ? t("copied", { defaultValue: "Copied" })
                      : t("copy", { defaultValue: "Copy" })
                  }
                >
                  <span className="material-symbols-outlined">
                    {uidCopied.value ? "check" : "content_copy"}
                  </span>
                </button>
              </div>
            </div>

            <div className="sb-settings-actions">
              <button
                className="sb-settings-save-button sb-account-save-button"
                onClick={handleSave}
              >
                {t("save-changes", { defaultValue: "Save changes" })}
              </button>
            </div>

            <div className="sb-account-signout-section">
              <button
                className="sb-account-signout-button"
                onClick={() => void os.signOut()}
              >
                <span className="material-symbols-outlined">logout</span>
                {t("sign-out", { defaultValue: "Sign out" })}
              </button>
            </div>
          </div>
        ) : (
          <div className="sb-settings-login-prompt">
            <p>
              {t("login-required-message", {
                defaultValue: "Please log in to view and edit your profile.",
              })}
            </p>
            <button
              className="sb-settings-action-button"
              onClick={() => void login.login()}
            >
              {t("log-in", { defaultValue: "Log in" })}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ScriptureLineHeightIcon({ index }: { index: number }) {
  const gap = 3.5 + index * 1.5;
  const startY = 1;
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
      <rect x="0" y={startY} width="20" height="2" rx="1" fill="currentColor" />
      <rect
        x="0"
        y={startY + gap}
        width="20"
        height="2"
        rx="1"
        fill="currentColor"
      />
      <rect
        x="0"
        y={startY + 2 * gap}
        width="20"
        height="2"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}

function ThemeAndTextSettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
  onOpenAllSettings: () => void;
}) {
  const { state, onBack, onOpenAllSettings } = props;
  const { themes, selectedThemeId, setTheme } = state.theme;
  const { config, setFontSize } = state.config;
  const selectedFontSize = config.value.fontSize;
  const settings = state.settings;
  const isMobile = state.app.isMobile.value;

  const verseConfig = settings.settings.value.textConfig.verse;
  const currentMargin = settings.settings.value.scriptureMargin;
  const currentLineHeight = verseConfig.lineHeight ?? DEFAULT_VERSE_LINE_HEIGHT;
  const lineHeightIndex = (() => {
    const idx = VERSE_LINE_HEIGHT_OPTIONS.indexOf(currentLineHeight);
    return idx === -1 ? 0 : idx;
  })();

  const fontSizeIndex = FONT_SIZE_OPTIONS.indexOf(selectedFontSize);

  const handleDecreaseFontSize = () => {
    if (fontSizeIndex > 0) {
      const next = FONT_SIZE_OPTIONS[fontSizeIndex - 1];
      if (next) setFontSize(next);
    }
  };

  const handleIncreaseFontSize = () => {
    if (fontSizeIndex < FONT_SIZE_OPTIONS.length - 1) {
      const next = FONT_SIZE_OPTIONS[fontSizeIndex + 1];
      if (next) setFontSize(next);
    }
  };

  const handleCycleLineHeight = () => {
    const nextIndex = (lineHeightIndex + 1) % VERSE_LINE_HEIGHT_OPTIONS.length;
    const next = VERSE_LINE_HEIGHT_OPTIONS[nextIndex];
    if (next !== undefined) settings.setVerseLineHeight(next);
  };

  const setMargin = (next: number) => {
    if (!Number.isFinite(next)) return;
    settings.setScriptureMargin(Math.max(0, Math.min(200, next)));
  };

  const { t } = useI18n();

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("theme-and-text", { defaultValue: "Theme and Text" }),
        ]}
      />
      <SettingsHero
        icon="palette"
        title={t("theme-and-text", { defaultValue: "Theme and Text" })}
        description={t("theme-and-text-description", {
          defaultValue:
            "Pick a theme and tune the Scripture reading experience.",
        })}
      />

      <section className="sb-settings-section">
        <h3 className="sb-settings-subheading">
          {t("themes", { defaultValue: "Themes" })}
        </h3>
        <div className="sb-theme-ready-gallery">
          {themes.value.map((theme) => {
            const isSelected = theme.id === selectedThemeId.value;
            const vars = theme.variables;
            return (
              <button
                key={theme.id}
                type="button"
                className={`sb-theme-ready-card${
                  isSelected ? " sb-theme-ready-card-selected" : ""
                }`}
                onClick={() => setTheme(theme.id)}
              >
                <div
                  className="sb-theme-ready-preview"
                  style={{
                    background: vars.readerBackground ?? vars.background,
                  }}
                >
                  <div
                    className="sb-theme-ready-swatch sb-theme-ready-swatch-a"
                    style={{ background: vars.primaryColor }}
                  />
                  <div
                    className="sb-theme-ready-swatch sb-theme-ready-swatch-b"
                    style={{ background: vars.secondaryColor }}
                  />
                  <div
                    className="sb-theme-ready-swatch sb-theme-ready-swatch-c"
                    style={{ background: vars.tertiaryColor }}
                  />
                </div>
                <div className="sb-theme-ready-label">
                  <span>{theme.name}</span>
                  {isSelected && (
                    <span
                      className="material-symbols-outlined sb-theme-ready-check"
                      aria-label={t("selected", { defaultValue: "Selected" })}
                    >
                      check_circle
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <h3 className="sb-settings-subheading">
          {t("scripture-settings", { defaultValue: "Scripture settings" })}
        </h3>
        <div className="sb-scripture-quick-row">
          <button
            type="button"
            className="sb-scripture-quick-btn sb-scripture-quick-btn-a-small"
            onClick={handleDecreaseFontSize}
            disabled={fontSizeIndex <= 0}
            aria-label={t("decrease-scripture-font-size", {
              defaultValue: "Decrease scripture font size",
            })}
          >
            {t("scripture-settings-font-size-example", { defaultValue: "A" })}
          </button>
          <button
            type="button"
            className="sb-scripture-quick-btn sb-scripture-quick-btn-a-large"
            onClick={handleIncreaseFontSize}
            disabled={fontSizeIndex >= FONT_SIZE_OPTIONS.length - 1}
            aria-label={t("increase-scripture-font-size", {
              defaultValue: "Increase scripture font size",
            })}
          >
            {t("scripture-settings-font-size-example", { defaultValue: "A" })}
          </button>
          <button
            type="button"
            className="sb-scripture-quick-btn"
            onClick={handleCycleLineHeight}
            aria-label={t("change-line-spacing", {
              defaultValue: "Change line spacing",
            })}
            title={t("line-spacing_lineHeight", {
              lineHeight: currentLineHeight,
              defaultValue: `Line spacing: ${currentLineHeight}`,
            })}
          >
            <ScriptureLineHeightIcon index={lineHeightIndex} />
          </button>
        </div>

        {!isMobile && (
          <>
            <div className="sb-scripture-margins-label">
              <span className="sb-margin-icon-wrap">
                <MarginIcon />
              </span>
              {t("scripture-margins", { defaultValue: "Scripture Margins" })}
            </div>
            <div className="sb-scripture-margins-row">
              <button
                type="button"
                className="sb-scripture-margins-step"
                onClick={() => setMargin(currentMargin - 1)}
                aria-label={t("decrease-scripture-margin", {
                  defaultValue: "Decrease scripture margin",
                })}
              >
                −
              </button>
              <div className="sb-scripture-margins-value">
                <input
                  type="number"
                  className="sb-scripture-margins-input"
                  value={currentMargin}
                  min={0}
                  max={45}
                  onInput={(event: Event) => {
                    const target = event.currentTarget as HTMLInputElement;
                    const parsed = Number(target.value);
                    if (Number.isFinite(parsed)) setMargin(parsed);
                  }}
                />
                {/* eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content */}
                <span className="sb-scripture-margins-unit">%</span>
              </div>
              <button
                type="button"
                className="sb-scripture-margins-step"
                onClick={() => setMargin(currentMargin + 1)}
                aria-label={t("increase-scripture-margin", {
                  defaultValue: "Increase scripture margin",
                })}
              >
                +
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          className="sb-settings-nav-item"
          onClick={onOpenAllSettings}
        >
          <span>{t("all-settings", { defaultValue: "All settings" })}</span>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
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

  const { t } = useI18n();

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("extensions", { defaultValue: "Extensions" }),
        ]}
      />
      <section className="sb-settings-section">
        {extensionsList.length === 0 ? (
          <div className="sb-settings-empty-state">
            <p>
              {t("no-extensions-available", {
                defaultValue: "No extensions available.",
              })}
            </p>
          </div>
        ) : (
          <ul className="sb-extensions-list">
            {extensionsList.map((extensionEntry) => {
              const { id, installed, pendingInstallation } = extensionEntry;
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
                        {/* eslint-disable-next-line seed-bible-i18n/translation-missing-keys */}
                        {t("title", { ns: id, defaultValue: id })}
                      </span>
                      <span className="sb-extension-description">
                        {t("description", { ns: id, defaultValue: "" })}
                      </span>
                    </div>
                  </button>

                  <ContextMenuWithButton>
                    {installState === "none" && (
                      <ContextMenuItem onClick={() => void handleInstall(id)}>
                        {t("install", { defaultValue: "Install" })}
                      </ContextMenuItem>
                    )}
                    {(installState === "installed" ||
                      installState === "downloaded") && (
                      <ContextMenuItem onClick={() => handleUninstall(id)}>
                        {t("uninstall", { defaultValue: "Uninstall" })}
                      </ContextMenuItem>
                    )}
                  </ContextMenuWithButton>
                  {/* <div className="sb-context-menu-anchor">
                    <button
                      className="sb-context-menu-button"
                      aria-label="Extension options"
                      title="Extension options"
                      onClick={() => {
                        openMenuId.value = openMenuId.value === id ? null : id;
                      }}
                    >
                      <span className="material-symbols-outlined sb-context-more-icon">
                        more_vert
                      </span>
                    </button>

                    <ContextMenu isOpen={openMenuId.value === id}>
                      
                    </ContextMenu>
                  </div> */}
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

function ToolbarSettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { tools: toolsManager, settings } = state;
  const { t } = useI18n();

  const available = toolsManager.listToolbarTools();
  const toolbarConfig = settings.settings.value.toolbar;
  const hiddenSet = new Set(toolbarConfig.hidden);

  const allIds = available.map((tool) => tool.id);
  const orderedIds = [
    ...toolbarConfig.order.filter((id) => allIds.includes(id)),
    ...allIds.filter((id) => !toolbarConfig.order.includes(id)),
  ];

  const moveTool = (index: number, direction: -1 | 1) => {
    const next = [...orderedIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const current = next[index];
    const swap = next[target];
    if (current === undefined || swap === undefined) return;
    next[index] = swap;
    next[target] = current;
    settings.setToolbarOrder(next);
  };

  const toggleVisible = (id: string) => {
    settings.setToolbarHidden(id, !hiddenSet.has(id));
  };

  const isCustomized =
    toolbarConfig.hidden.length > 0 || toolbarConfig.order.length > 0;

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={["Page settings", "Toolbar"]}
      />
      <SettingsHero
        icon="tune"
        title={t("toolbar", { defaultValue: "Toolbar" })}
        description={t("toolbar_description", {
          defaultValue:
            "Choose which reader toolbar tools appear and in what order.",
        })}
      />

      <section className="sb-settings-section">
        <ul className="sb-toolbar-config-list">
          {orderedIds.map((id, index) => {
            const tool = available.find((entry) => entry.id === id);
            if (!tool) return null;
            const title = translateTitle(t, tool.title);
            const isHidden = hiddenSet.has(id);
            const isFirst = index === 0;
            const isLast = index === orderedIds.length - 1;

            return (
              <li
                key={id}
                className={`sb-toolbar-config-row${
                  isHidden ? " sb-toolbar-config-row-hidden" : ""
                }`}
              >
                <div className="sb-toolbar-config-reorder">
                  <button
                    type="button"
                    className="sb-toolbar-config-move-button"
                    onClick={() => moveTool(index, -1)}
                    disabled={isFirst}
                    aria-label={`Move ${title} up`}
                  >
                    <span className="material-symbols-outlined">
                      arrow_upward
                    </span>
                  </button>
                  <button
                    type="button"
                    className="sb-toolbar-config-move-button"
                    onClick={() => moveTool(index, 1)}
                    disabled={isLast}
                    aria-label={`Move ${title} down`}
                  >
                    <span className="material-symbols-outlined">
                      arrow_downward
                    </span>
                  </button>
                </div>
                <span className="sb-toolbar-config-title">{title}</span>
                <div className="sb-settings-toggle-row sb-toolbar-config-toggle">
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    aria-label={`${title} visibility`}
                    onChange={(event: Event) => {
                      const target = event.currentTarget as HTMLInputElement;
                      settings.setToolbarHidden(id, !target.checked);
                    }}
                    onClick={(event: Event) => {
                      event.stopPropagation();
                      toggleVisible(id);
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {isCustomized && (
          <div className="sb-settings-actions">
            <button
              type="button"
              className="sb-settings-action-button"
              onClick={() => settings.resetToolbarConfig()}
            >
              {t("reset-toolbar", { defaultValue: "Reset toolbar" })}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function TextFormattingToolbar(props: {
  sectionId: TextSectionId;
  section: TextSectionConfig;
  onChange: (patch: Partial<TextSectionConfig>) => void;
}) {
  const { sectionId, section, onChange } = props;
  const paletteOpen = useSignal(false);
  const themeFallback = `var(${TEXT_SECTION_THEME_COLOR_VAR[sectionId]})`;
  const swatchBackground = section.color || themeFallback;
  const { t } = useI18n();

  const toggle = (key: "bold" | "italic" | "underline") => {
    onChange({ [key]: !section[key] } as Partial<TextSectionConfig>);
  };

  const cycleAlignment = () => {
    onChange({ alignment: ALIGNMENT_CYCLE[section.alignment] });
  };

  return (
    <div className="sb-text-format-toolbar">
      <button
        type="button"
        className={`sb-text-format-btn${section.bold ? " sb-text-format-btn-active" : ""}`}
        onClick={() => toggle("bold")}
        aria-label={t("bold", { defaultValue: "Bold" })}
        title={t("bold")}
        aria-pressed={section.bold}
      >
        <span className="material-symbols-outlined">format_bold</span>
      </button>
      <button
        type="button"
        className={`sb-text-format-btn${section.italic ? " sb-text-format-btn-active" : ""}`}
        onClick={() => toggle("italic")}
        aria-label={t("italic", { defaultValue: "Italic" })}
        title={t("italic")}
        aria-pressed={section.italic}
      >
        <span className="material-symbols-outlined">format_italic</span>
      </button>
      <button
        type="button"
        className={`sb-text-format-btn${section.underline ? " sb-text-format-btn-active" : ""}`}
        onClick={() => toggle("underline")}
        aria-label={t("underline", { defaultValue: "Underline" })}
        title={t("underline")}
        aria-pressed={section.underline}
      >
        <span className="material-symbols-outlined">format_underlined</span>
      </button>

      <div className="sb-text-format-divider" aria-hidden="true" />

      <button
        type="button"
        className="sb-text-format-btn"
        onClick={cycleAlignment}
        aria-label={t("alignment_x", {
          defaultValue: `Alignment: ${section.alignment}`,
        })}
        title={t("change_alignment", { defaultValue: "Change alignment" })}
      >
        <span className="material-symbols-outlined">
          {ALIGNMENT_ICON[section.alignment]}
        </span>
      </button>

      <div className="sb-text-format-divider" aria-hidden="true" />

      <div className="sb-text-format-color-wrap">
        <button
          type="button"
          className="sb-text-format-color-button"
          onClick={() => {
            paletteOpen.value = !paletteOpen.value;
          }}
          aria-label={t("pick_text_color", { defaultValue: "Pick text color" })}
          title={t("text_color", { defaultValue: "Text color" })}
        >
          <span
            className="sb-text-format-color-swatch"
            style={{ background: swatchBackground }}
          />
        </button>
        {paletteOpen.value && (
          <div className="sb-text-format-palette" role="menu">
            <button
              type="button"
              className={`sb-text-format-palette-swatch${
                section.color === ""
                  ? " sb-text-format-palette-swatch-selected"
                  : ""
              }`}
              style={{ background: themeFallback }}
              aria-label={t("follow_theme", { defaultValue: "Follow theme" })}
              title={t("follow_theme", { defaultValue: "Follow theme" })}
              onClick={() => {
                onChange({ color: "" });
                paletteOpen.value = false;
              }}
            />
            {TEXT_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                className={`sb-text-format-palette-swatch${
                  color.toLowerCase() === section.color.toLowerCase()
                    ? " sb-text-format-palette-swatch-selected"
                    : ""
                }`}
                style={{ background: color }}
                aria-label={color}
                onClick={() => {
                  onChange({ color });
                  paletteOpen.value = false;
                }}
              />
            ))}
            <label className="sb-text-format-palette-custom">
              <span>{t("custom", { defaultValue: "Custom" })}</span>
              <input
                type="color"
                value={toHexInputValue(section.color)}
                onInput={(event: Event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  onChange({ color: target.value });
                }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function TextSettingsContent(props: { state: SeedBibleState }) {
  const { state } = props;
  const { settings } = state;
  const textConfig = settings.settings.value.textConfig;
  const { t } = useI18n();

  return (
    <section className="sb-settings-section">
      {TEXT_SECTION_ORDER.map((section) => {
        const config = textConfig[section];
        const handleChange = (patch: Partial<TextSectionConfig>) =>
          settings.updateTextSection(section, patch);

        return (
          <div key={section} className="sb-text-section">
            <h3 className="sb-text-section-title">
              {t(`text-section-${section}`, { defaultValue: section })}
            </h3>

            <div className="sb-settings-field-row">
              <label className="sb-settings-field-label">
                {t("font", { defaultValue: "Font" })}
              </label>
              <select
                className="sb-settings-language-select"
                value={config.font}
                onChange={(event: Event) => {
                  const target = event.currentTarget as HTMLSelectElement;
                  handleChange({ font: target.value });
                }}
              >
                {TEXT_FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label, { defaultValue: option.label })}
                  </option>
                ))}
              </select>
            </div>

            <div className="sb-settings-field-row">
              <label className="sb-settings-field-label">
                {t("weight", { defaultValue: "Weight" })}
              </label>
              <select
                className="sb-settings-language-select"
                value={config.weight}
                onChange={(event: Event) => {
                  const target = event.currentTarget as HTMLSelectElement;
                  handleChange({ weight: target.value });
                }}
              >
                {TEXT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label, { defaultValue: option.label })}
                  </option>
                ))}
              </select>
            </div>

            <div className="sb-settings-field-row">
              <label className="sb-settings-field-label">
                {t("margin-vertical", {
                  defaultValue: "Margin (vertical, px)",
                })}
              </label>
              <input
                type="number"
                className="sb-settings-text-input"
                value={config.marginVertical}
                onInput={(event: Event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  const parsed = Number(target.value);
                  if (Number.isFinite(parsed)) {
                    handleChange({ marginVertical: parsed });
                  }
                }}
                placeholder="10"
              />
            </div>

            <div className="sb-settings-field-row">
              <label className="sb-settings-field-label">
                {t("margin-horizontal", {
                  defaultValue: "Margin (horizontal, px)",
                })}
              </label>
              <input
                type="number"
                className="sb-settings-text-input"
                value={config.marginHorizontal}
                onInput={(event: Event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  const parsed = Number(target.value);
                  if (Number.isFinite(parsed)) {
                    handleChange({ marginHorizontal: parsed });
                  }
                }}
                placeholder="10"
              />
            </div>

            <TextFormattingToolbar
              sectionId={section}
              section={config}
              onChange={handleChange}
            />
          </div>
        );
      })}

      <div className="sb-settings-actions">
        <button
          type="button"
          className="sb-settings-action-button"
          onClick={() => settings.resetTextConfig()}
        >
          {t("reset-text-settings", { defaultValue: "Reset text settings" })}
        </button>
      </div>
    </section>
  );
}

function ThemeCustomColorsContent(props: { state: SeedBibleState }) {
  const { state } = props;
  const { theme } = state;
  const { t } = useI18n();

  const effectiveTheme = useComputed(() => theme.currentTheme.value);
  const overrides = useComputed(() => theme.customOverrides.value);
  const hasOverrides = useComputed(
    () => Object.keys(theme.customOverrides.value).length > 0
  );

  return (
    <section className="sb-settings-section">
      <h3 className="sb-settings-subheading">
        {t("customize-colors", { defaultValue: "Customize colors" })}
      </h3>
      {THEME_COLOR_GROUPS.map((group) => (
        <div key={group.id} className="sb-theme-colors-group">
          <h3 className="sb-settings-subheading">{group.title}</h3>
          <ul className="sb-theme-colors-list">
            {group.fields.map((field) => {
              const currentValue =
                effectiveTheme.value.variables[field.key] ?? "";
              const hexValue = toHexInputValue(
                typeof currentValue === "string" ? currentValue : ""
              );
              const isOverridden =
                overrides.value[field.key as ThemeColorKey] !== undefined;

              return (
                <li key={field.key} className="sb-theme-color-row">
                  <div className="sb-theme-color-row-main">
                    <span className="sb-theme-color-label">{field.label}</span>
                    <span className="sb-theme-color-value">
                      {typeof currentValue === "string" && currentValue
                        ? currentValue
                        : "—"}
                    </span>
                  </div>
                  <div className="sb-theme-color-row-controls">
                    <input
                      type="color"
                      className="sb-theme-color-input"
                      value={hexValue}
                      aria-label={field.label}
                      onInput={(event: Event) => {
                        const target = event.currentTarget as HTMLInputElement;
                        theme.setCustomColor(field.key, target.value);
                      }}
                    />
                    {isOverridden && (
                      <button
                        type="button"
                        className="sb-theme-color-reset"
                        title={t("reset-to-default", {
                          defaultValue: "Reset to default",
                        })}
                        aria-label={`Reset ${field.label}`}
                        onClick={() => theme.resetCustomColor(field.key)}
                      >
                        <span className="material-symbols-outlined">
                          restart_alt
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <h3 className="sb-settings-subheading">
        {t("highlight-colors", { defaultValue: "Highlight colors" })}
      </h3>
      <ul className="sb-theme-colors-list">
        {DEFAULT_HIGHLIGHT_IDS.map((id) => {
          const effective = effectiveTheme.value.highlightColors[id];
          const bg = effective?.color ?? "";
          const fg = effective?.fontColor ?? "";
          const isOverridden =
            theme.customHighlightOverrides.value[id] !== undefined;

          return (
            <li key={id} className="sb-theme-color-row">
              <div className="sb-theme-color-row-main">
                <span
                  className="sb-highlight-preview-pill"
                  style={{ background: bg, color: fg }}
                  aria-hidden="true"
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </span>
                <span className="sb-theme-color-value">{bg || "—"}</span>
              </div>
              <div className="sb-theme-color-row-controls">
                <input
                  type="color"
                  className="sb-theme-color-input"
                  value={toHexInputValue(bg)}
                  aria-label={t("id_highlight-background-color", { id })}
                  title={t("highlight-background-color", {
                    defaultValue: "Highlight background color",
                  })}
                  onInput={(event: Event) => {
                    const target = event.currentTarget as HTMLInputElement;
                    theme.setHighlightColor(id, { color: target.value });
                  }}
                />
                <input
                  type="color"
                  className="sb-theme-color-input"
                  value={toHexInputValue(fg)}
                  aria-label={t("id_highlight-text-color", { id })}
                  title={t("highlight-text-color", {
                    defaultValue: "Highlight text color",
                  })}
                  onInput={(event: Event) => {
                    const target = event.currentTarget as HTMLInputElement;
                    theme.setHighlightColor(id, { fontColor: target.value });
                  }}
                />
                {isOverridden && (
                  <button
                    type="button"
                    className="sb-theme-color-reset"
                    title={t("reset-to-default", {
                      defaultValue: "Reset to default",
                    })}
                    aria-label={t("reset-to-default", {
                      defaultValue: "Reset to default",
                    })}
                    onClick={() => theme.resetHighlightColor(id)}
                  >
                    <span className="material-symbols-outlined">
                      restart_alt
                    </span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {(hasOverrides.value ||
        Object.keys(theme.customHighlightOverrides.value).length > 0) && (
        <div className="sb-settings-actions">
          <button
            type="button"
            className="sb-settings-action-button"
            onClick={() => {
              theme.resetAllCustomColors();
              theme.resetAllHighlightColors();
            }}
          >
            {t("reset-all-custom-colors", {
              defaultValue: "Reset all custom colors",
            })}
          </button>
        </div>
      )}
    </section>
  );
}

function AllSettingsView(props: { state: SeedBibleState; onBack: () => void }) {
  const { state, onBack } = props;
  const { t } = useI18n();
  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("theme-and-text", { defaultValue: "Theme and Text" }),
          t("all-settings", { defaultValue: "All settings" }),
        ]}
      />
      <SettingsHero
        icon="tune"
        title={t("all-settings", { defaultValue: "All settings" })}
        description={t("all-settings-description", {
          defaultValue:
            "Fine-tune every text section and customize each theme color.",
        })}
      />
      <TextSettingsContent state={state} />
      <ThemeCustomColorsContent state={state} />
    </div>
  );
}

function DisplaySettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { settings } = state;
  const current = settings.settings.value;
  const { t } = useI18n();

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("display", { defaultValue: "Display" }),
        ]}
      />
      <section className="sb-settings-section">
        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-ui-text-size-select"
          >
            {t("ui-text-size", { defaultValue: "UI text size" })}
          </label>
          <select
            id="sb-ui-text-size-select"
            className="sb-settings-language-select"
            value={current.uiTextSize}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              settings.setUITextSize(target.value as UITextSize);
            }}
          >
            {UI_TEXT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-book-orientation-select"
          >
            {t("book-order", { defaultValue: "Book order" })}
          </label>
          <select
            id="sb-book-orientation-select"
            className="sb-settings-language-select"
            value={current.bookOrientation}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              settings.setBookOrientation(target.value as BookOrientation);
            }}
          >
            <option value="traditional">
              {t("traditional", { defaultValue: "Traditional" })}
            </option>
            <option value="tanak">
              {t("tanakh", { defaultValue: "Tanakh" })}
            </option>
          </select>
        </div>

        <h3 className="sb-settings-subheading">
          {t("selection-ui", { defaultValue: "Selection UI" })}
        </h3>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-selected-items"
          >
            {t("show-selected-items", { defaultValue: "Show selected items" })}
          </label>
          <input
            id="sb-show-selected-items"
            type="checkbox"
            checked={current.selectionUI.showSelectedItems}
            onChange={(event: Event) => {
              settings.setSelectionUI({
                showSelectedItems: (event.currentTarget as HTMLInputElement)
                  .checked,
              });
            }}
          />
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-highlight-colors"
          >
            {t("show-highlight-colors", {
              defaultValue: "Show highlight colors",
            })}
          </label>
          <input
            id="sb-show-highlight-colors"
            type="checkbox"
            checked={current.selectionUI.showHighlightColors}
            onChange={(event: Event) => {
              settings.setSelectionUI({
                showHighlightColors: (event.currentTarget as HTMLInputElement)
                  .checked,
              });
            }}
          />
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-icon-text"
          >
            {t("show-icon-text", { defaultValue: "Show icon text" })}
          </label>
          <input
            id="sb-show-icon-text"
            type="checkbox"
            checked={current.selectionUI.showIconText}
            onChange={(event: Event) => {
              settings.setSelectionUI({
                showIconText: (event.currentTarget as HTMLInputElement).checked,
              });
            }}
          />
        </div>
      </section>
    </div>
  );
}

function SettingsMainView(props: {
  state: SeedBibleState;
  onNavigate: (view: SettingsView) => void;
}) {
  const { state, onNavigate } = props;
  const { t, language, availableLanguages, setLanguage } = useI18n();
  const isAwake = state.settings.settings.value.keepScreenAwake;
  const isLanguageMenuOpen = useSignal(false);

  const handleWakeLockToggle = (checked: boolean) => {
    state.settings.setKeepScreenAwake(checked);
  };

  const currentLangMeta = LANG_META[language] ?? {
    cc: "",
    display: language.toUpperCase(),
  };

  return (
    <div className="sb-settings-page">
      <section className="sb-settings-section">
        {/* <h2 className="sb-settings-title">
          {t("general-settings", { defaultValue: "General settings" })}
        </h2> */}
        <ul className="sb-settings-list">
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("account")}
            >
              <span className="sb-settings-nav-icon">
                <MaterialIcon>person</MaterialIcon>
              </span>
              <span className="sb-settings-nav-label">
                {t("account-settings", { defaultValue: "Account settings" })}
              </span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("theme")}
            >
              <span className="sb-settings-nav-icon">
                <ThemeIcon />
              </span>
              <span className="sb-settings-nav-label">
                {t("theme-and-text", { defaultValue: "Theme and Text" })}
              </span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("toolbar")}
            >
              <span className="sb-settings-nav-icon">
                <MaterialIcon>tune</MaterialIcon>
              </span>
              <span className="sb-settings-nav-label">
                {t("toolbar", { defaultValue: "Toolbar" })}
              </span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("extensions")}
            >
              <span className="sb-settings-nav-icon">
                <ExtensionsIcon />
              </span>
              <span className="sb-settings-nav-label">
                {t("extensions", { defaultValue: "Extensions" })}
              </span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("display")}
            >
              <span className="sb-settings-nav-icon">
                <TheNewSettingsIcon />
              </span>
              <span className="sb-settings-nav-label">
                {t("display", { defaultValue: "Display" })}
              </span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <div className="sb-settings-toggle-row">
              <label
                className="sb-settings-toggle-label"
                htmlFor="sb-wake-lock-toggle"
              >
                {t("keep-screen-awake", { defaultValue: "Keep screen awake" })}
              </label>
              <input
                id="sb-wake-lock-toggle"
                type="checkbox"
                checked={isAwake}
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
              <span className="sb-settings-field-label">
                {t("language", { defaultValue: "Language" })}
              </span>
              <div className="sb-language-picker">
                <button
                  type="button"
                  id="sb-language-select"
                  className="sb-settings-language-select sb-language-picker-button"
                  onClick={() => {
                    isLanguageMenuOpen.value = !isLanguageMenuOpen.value;
                  }}
                >
                  {currentLangMeta.cc && <FlagImg cc={currentLangMeta.cc} />}
                  <span>{currentLangMeta.display}</span>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "16px" }}
                  >
                    expand_more
                  </span>
                </button>
                {isLanguageMenuOpen.value && (
                  <>
                    <div
                      className="sb-language-picker-overlay"
                      onClick={() => {
                        isLanguageMenuOpen.value = false;
                      }}
                    />
                    <div className="sb-language-picker-menu">
                      {availableLanguages.map((languageCode) => {
                        const meta = LANG_META[languageCode];
                        const isSelected = languageCode === language;
                        return (
                          <button
                            key={languageCode}
                            type="button"
                            className={`sb-language-picker-item${
                              isSelected
                                ? " sb-language-picker-item-selected"
                                : ""
                            }`}
                            onClick={() => {
                              void setLanguage(languageCode);
                              isLanguageMenuOpen.value = false;
                            }}
                          >
                            {meta?.cc && <FlagImg cc={meta.cc} />}
                            <span>
                              {meta?.display ?? languageCode.toUpperCase()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </li>
          <li>
            <div className="sb-settings-field-row">
              <button
                className="sb-settings-action-button"
                onClick={() => {
                  window.open(
                    "https://docs.google.com/forms/d/e/1FAIpQLSejiuVM8xguEHKZ2Kv5DX-jE98zYwxFiPwpYrFSmvVgMejZzQ/viewform",
                    "_blank"
                  );
                }}
              >
                {t("report-a-bug", { defaultValue: "Report a bug" })}
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}

export function SettingsPage(props: { state: SeedBibleState }) {
  const { state } = props;
  // Honor a deep-link requested by the sidebar (e.g. clicking the
  // bottom-right avatar opens Account settings directly). Consumed once and
  // cleared so subsequent opens start at the main list.
  const requested = state.sidebar.requestedSettingsView.value;
  const currentView = useSignal<SettingsView>(
    (requested as SettingsView | null) ?? null
  );
  if (requested) {
    state.sidebar.requestedSettingsView.value = null;
  }

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
      <ThemeAndTextSettingsView
        state={state}
        onBack={() => {
          currentView.value = null;
        }}
        onOpenAllSettings={() => {
          currentView.value = "all-settings";
        }}
      />
    );
  }

  if (currentView.value === "all-settings") {
    return (
      <AllSettingsView
        state={state}
        onBack={() => {
          currentView.value = "theme";
        }}
      />
    );
  }

  if (currentView.value === "toolbar") {
    return (
      <ToolbarSettingsView
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

  if (currentView.value === "display") {
    return (
      <DisplaySettingsView
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
