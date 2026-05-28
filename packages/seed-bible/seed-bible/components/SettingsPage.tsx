import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { TextSize } from "seed-bible.managers.ConfigManager";
import {
  AppSettingsSchema,
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
  ExtensionsIcon,
  MarginIcon,
  MaterialIcon,
  ThemeIcon,
} from "seed-bible.components.icons";
import {
  handleGridKeyNav,
  handleMenuTriggerKeyDown,
  handleVerticalListKeyNav,
} from "seed-bible.components.KeyboardNav";
import { useRef } from "preact/hooks";
import { z } from "zod";
import type { RequestedSettingsView } from "seed-bible.managers.SidebarManager";

const TEXT_SECTION_ORDER: TextSectionId[] = ["bookTitle", "heading", "verse"];

const ALIGNMENT_CYCLE: Record<TextAlignment, TextAlignment> = {
  unset: "left",
  left: "center",
  center: "right",
  right: "left",
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
  af: { cc: "za", display: "Afrikaans" },
  am: { cc: "et", display: "አማርኛ" },
  ar: { cc: "sa", display: "العربية" },
  az: { cc: "az", display: "Azərbaycan dili" },
  be: { cc: "by", display: "Беларуская" },
  bg: { cc: "bg", display: "Български" },
  bn: { cc: "bd", display: "বাংলা" },
  bs: { cc: "ba", display: "Bosanski" },
  ca: { cc: "es", display: "Català" },
  cs: { cc: "cz", display: "Čeština" },
  cy: { cc: "gb", display: "Cymraeg" },
  da: { cc: "dk", display: "Dansk" },
  de: { cc: "de", display: "Deutsch" },
  el: { cc: "gr", display: "Ελληνικά" },
  en: { cc: "us", display: "English" },
  es: { cc: "es", display: "Español" },
  et: { cc: "ee", display: "Eesti" },
  fa: { cc: "ir", display: "فارسی" },
  fi: { cc: "fi", display: "Suomi" },
  fil: { cc: "ph", display: "Filipino" },
  fr: { cc: "fr", display: "Français" },
  fy: { cc: "nl", display: "Frysk" },
  gl: { cc: "es", display: "Galego" },
  gn: { cc: "py", display: "Avañe'ẽ" },
  gu: { cc: "in", display: "ગુજરાતી" },
  he: { cc: "il", display: "עברית" },
  hi: { cc: "in", display: "हिन्दी" },
  hr: { cc: "hr", display: "Hrvatski" },
  hu: { cc: "hu", display: "Magyar" },
  ind: { cc: "id", display: "Bahasa Indonesia" },
  is: { cc: "is", display: "Íslenska" },
  it: { cc: "it", display: "Italiano" },
  iw: { cc: "il", display: "עברית" },
  ja: { cc: "jp", display: "日本語" },
  ka: { cc: "ge", display: "ქართული" },
  km: { cc: "kh", display: "ខ្មែរ" },
  kn: { cc: "in", display: "ಕನ್ನಡ" },
  ko: { cc: "kr", display: "한국어" },
  ky: { cc: "kg", display: "Кыргызча" },
  ln: { cc: "cd", display: "Lingála" },
  lo: { cc: "la", display: "ລາວ" },
  lt: { cc: "lt", display: "Lietuvių" },
  lv: { cc: "lv", display: "Latviešu" },
  mk: { cc: "mk", display: "Македонски" },
  mn: { cc: "mn", display: "Монгол хэл" },
  ml: { cc: "in", display: "മലയാളം" },
  mr: { cc: "in", display: "मराठी" },
  ms: { cc: "my", display: "Bahasa Melayu" },
  my: { cc: "mm", display: "မြန်မာ" },
  nb: { cc: "no", display: "Norsk bokmål" },
  ne: { cc: "np", display: "नेपाली" },
  nl: { cc: "nl", display: "Nederlands" },
  no: { cc: "no", display: "Norsk" },
  pa: { cc: "in", display: "ਪੰਜਾਬੀ" },
  pl: { cc: "pl", display: "Polski" },
  ps: { cc: "af", display: "پښتو" },
  pt: { cc: "br", display: "Português" },
  ro: { cc: "ro", display: "Română" },
  ru: { cc: "ru", display: "Русский" },
  sk: { cc: "sk", display: "Slovenčina" },
  sl: { cc: "si", display: "Slovenščina" },
  sq: { cc: "al", display: "Shqip" },
  sv: { cc: "se", display: "Svenska" },
  sw: { cc: "tz", display: "Kiswahili" },
  ta: { cc: "in", display: "தமிழ்" },
  te: { cc: "in", display: "తెలుగు" },
  th: { cc: "th", display: "ไทย" },
  ti: { cc: "er", display: "ትግርኛ" },
  tl: { cc: "ph", display: "Tagalog" },
  tr: { cc: "tr", display: "Türkçe" },
  ug: { cc: "cn", display: "ئۇيغۇرچە" },
  uk: { cc: "ua", display: "Українська" },
  ur: { cc: "pk", display: "اردو" },
  uz: { cc: "uz", display: "Oʻzbekcha" },
  vi: { cc: "vn", display: "Tiếng Việt" },
  zh: { cc: "cn", display: "中文" },
  zu: { cc: "za", display: "isiZulu" },
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

function AccountSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { login } = state;
  const { t } = useI18n();
  const isLoggedIn = useComputed(() => login.userId.value !== null);
  const profile = useComputed(() => login.profile.value);

  const newName = useSignal<string>("");
  const name = useComputed(() => (newName.value || profile.value?.name) ?? "");
  const newLocation = useSignal<string>("");
  const location = useComputed(
    () => (newLocation.value || profile.value?.location) ?? ""
  );
  const newDescription = useSignal<string>("");
  const description = useComputed(
    () => (newDescription.value || profile.value?.description) ?? ""
  );
  const pictureUrl = useComputed(() => profile.value?.pictureUrl ?? "");
  const isUploadingPicture = useSignal(false);
  const uidCopied = useSignal(false);

  const handleSave = () => {
    login.updateProfile({
      name: name.value,
      location: location.value || null,
      description: description.value || null,
      pictureUrl: pictureUrl.value || null,
    });
    newName.value = "";
    newLocation.value = "";
    newDescription.value = "";
  };

  const handleUploadPicture = async () => {
    if (isUploadingPicture.value) {
      return;
    }
    isUploadingPicture.value = true;
    try {
      await login.uploadProfilePicture();
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
        onBack={() => (state.sidebar.requestedSettingsView.value = "main")}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("account-settings", { defaultValue: "Account settings" }),
        ]}
      />
      <section className="sb-settings-section">
        {isLoggedIn.value ? (
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
                  newName.value = (
                    event.currentTarget as HTMLInputElement
                  ).value;
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
                  newDescription.value = (
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
                  newLocation.value = (
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
                onClick={() => void login.logout()}
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

function DisplayAndThemeSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { themes, selectedThemeId, setTheme } = state.theme;
  const { config, setFontSize } = state.config;
  const selectedFontSize = config.value.fontSize;
  const settings = state.settings;
  const current = settings.settings.value;
  const isMobile = state.app.isMobile.value;

  const verseConfig = settings.settings.value.textConfig.verse;
  const currentMargin = settings.settings.value.scriptureMargin;
  const currentLineHeight = verseConfig.lineHeight ?? DEFAULT_VERSE_LINE_HEIGHT;
  const lineHeightIndex = (() => {
    const idx = VERSE_LINE_HEIGHT_OPTIONS.indexOf(currentLineHeight);
    return idx === -1 ? 0 : idx;
  })();

  const fontSizeIndex = FONT_SIZE_OPTIONS.indexOf(selectedFontSize);

  const onBack = () => {
    state.sidebar.requestedSettingsView.value = "main";
  };

  const onOpenAllSettings = () => {
    state.sidebar.requestedSettingsView.value =
      "display-and-theme-all-settings";
  };

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
    const currentLh =
      settings.settings.value.textConfig.verse.lineHeight ??
      DEFAULT_VERSE_LINE_HEIGHT;
    const idx = VERSE_LINE_HEIGHT_OPTIONS.indexOf(currentLh);
    const currentIdx = idx === -1 ? 0 : idx;
    const nextIndex = (currentIdx + 1) % VERSE_LINE_HEIGHT_OPTIONS.length;
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
          t("display-and-theme", { defaultValue: "Display & Theme" }),
        ]}
      />
      <SettingsHero
        icon="palette"
        title={t("display-and-theme", { defaultValue: "Display & Theme" })}
        description={t("display-and-theme-description", {
          defaultValue:
            "Pick a theme and tune how Scripture and the UI are displayed.",
        })}
      />

      <section className="sb-settings-section">
        <h3 className="sb-settings-subheading">
          {t("themes", { defaultValue: "Themes" })}
        </h3>
        <div
          className="sb-theme-ready-gallery"
          role="radiogroup"
          onKeyDown={(event) => {
            handleGridKeyNav(event, event.currentTarget);
          }}
        >
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

        <h3 className="sb-settings-subheading">
          {t("scripture-elements", { defaultValue: "Scripture elements" })}
        </h3>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-scripture-headings"
          >
            {t("show-headings", { defaultValue: "Show headings" })}
          </label>
          <input
            id="sb-show-scripture-headings"
            type="checkbox"
            checked={current.scriptureElements.showHeadings}
            onChange={(event: Event) => {
              settings.setScriptureElements({
                showHeadings: (event.currentTarget as HTMLInputElement).checked,
              });
            }}
          />
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-scripture-verse-numbers"
          >
            {t("show-verse-numbers", { defaultValue: "Show verse numbers" })}
          </label>
          <input
            id="sb-show-scripture-verse-numbers"
            type="checkbox"
            checked={current.scriptureElements.showVerseNumbers}
            onChange={(event: Event) => {
              settings.setScriptureElements({
                showVerseNumbers: (event.currentTarget as HTMLInputElement)
                  .checked,
              });
            }}
          />
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-scripture-footnotes"
          >
            {t("show-footnotes", { defaultValue: "Show footnotes" })}
          </label>
          <input
            id="sb-show-scripture-footnotes"
            type="checkbox"
            checked={current.scriptureElements.showFootnotes}
            onChange={(event: Event) => {
              settings.setScriptureElements({
                showFootnotes: (event.currentTarget as HTMLInputElement)
                  .checked,
              });
            }}
          />
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-scripture-highlights"
          >
            {t("show-highlights", { defaultValue: "Show highlights" })}
          </label>
          <input
            id="sb-show-scripture-highlights"
            type="checkbox"
            checked={current.scriptureElements.showHighlights}
            onChange={(event: Event) => {
              settings.setScriptureElements({
                showHighlights: (event.currentTarget as HTMLInputElement)
                  .checked,
              });
            }}
          />
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-red-lettering"
          >
            {t("show-red-lettering", { defaultValue: "Show red lettering" })}
          </label>
          <input
            id="sb-show-red-lettering"
            type="checkbox"
            checked={current.scriptureElements.showRedLettering}
            onChange={(event: Event) => {
              settings.setScriptureElements({
                showRedLettering: (event.currentTarget as HTMLInputElement)
                  .checked,
              });
            }}
          />
        </div>

        <h3 className="sb-settings-subheading">
          {t("display", { defaultValue: "Display" })}
        </h3>

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
            <option value="tanakh">
              {t("tanakh", { defaultValue: "Tanakh" })}
            </option>
          </select>
        </div>

        {isMobile && (
          <>
            <h3 className="sb-settings-subheading">
              {t("mobile", { defaultValue: "Mobile" })}
            </h3>

            <div className="sb-settings-toggle-row">
              <label
                className="sb-settings-toggle-label"
                htmlFor="sb-show-nav-arrows"
              >
                {t("show-nav-arrows", {
                  defaultValue: "Show navigation arrows",
                })}
              </label>
              <input
                id="sb-show-nav-arrows"
                type="checkbox"
                checked={current.showNavArrows}
                onChange={(event: Event) => {
                  settings.setShowNavArrows(
                    (event.currentTarget as HTMLInputElement).checked
                  );
                }}
              />
            </div>
          </>
        )}

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

function ExtensionsSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { extensions, login } = state;
  const extensionsList = extensions.extensions.value;
  const isLoggedIn = login.userId.value !== null;
  const installingIds = useSignal<Set<string>>(new Set());
  const isDownloadingSet = useSignal(false);
  const isUploadingSet = useSignal(false);

  const onBack = () => {
    state.sidebar.requestedSettingsView.value = "main";
  };

  const promptLogin = () => {
    void login.login();
  };

  const handleInstall = async (extensionId: string) => {
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
        {!isLoggedIn && (
          <div className="sb-settings-login-prompt">
            <p>
              {t("login-to-use-feature", {
                defaultValue: "You have to log in to use this feature.",
              })}
            </p>
            <button className="sb-settings-action-button" onClick={promptLogin}>
              {t("log-in", { defaultValue: "Log in" })}
            </button>
          </div>
        )}
        {extensionsList.length === 0 ? (
          <div className="sb-settings-empty-state">
            <p>
              {t("no-extensions-available", {
                defaultValue: "No extensions available.",
              })}
            </p>
          </div>
        ) : (
          <ul
            className={`sb-extensions-list${
              !isLoggedIn ? " sb-extensions-list-disabled" : ""
            }`}
            aria-disabled={!isLoggedIn}
          >
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
                  <div className="sb-extension-row-body">
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
                    <div className="sb-extension-row-actions">
                      {installState === "none" && (
                        <button
                          type="button"
                          className="sb-extension-row-action-button"
                          onClick={() => {
                            if (!isLoggedIn) {
                              promptLogin();
                              return;
                            }
                            void handleInstall(id);
                          }}
                          aria-label={t("install", { defaultValue: "Install" })}
                          title={
                            isLoggedIn
                              ? t("install", { defaultValue: "Install" })
                              : t("login-to-use-feature", {
                                  defaultValue:
                                    "You have to log in to use this feature.",
                                })
                          }
                        >
                          <span className="material-symbols-outlined">
                            download
                          </span>
                        </button>
                      )}
                      {(installState === "installed" ||
                        installState === "downloaded") && (
                        <button
                          type="button"
                          className="sb-extension-row-action-button"
                          onClick={() => {
                            if (!isLoggedIn) {
                              promptLogin();
                              return;
                            }
                            handleUninstall(id);
                          }}
                          aria-label={t("uninstall", {
                            defaultValue: "Uninstall",
                          })}
                          title={
                            isLoggedIn
                              ? t("uninstall", { defaultValue: "Uninstall" })
                              : t("login-to-use-feature", {
                                  defaultValue:
                                    "You have to log in to use this feature.",
                                })
                          }
                        >
                          <span className="material-symbols-outlined">
                            delete
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="sb-extension-footer-actions">
          <button
            className="sb-settings-action-button"
            onClick={() => {
              if (!isLoggedIn) {
                promptLogin();
                return;
              }
              void handleDownloadExtensions();
            }}
            disabled={isDownloadingSet.value}
          >
            {isDownloadingSet.value
              ? "Downloading Extensions..."
              : "Download Extensions"}
          </button>
          <button
            className="sb-settings-action-button"
            onClick={() => {
              if (!isLoggedIn) {
                promptLogin();
                return;
              }
              void handleUploadExtensions();
            }}
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

function ToolbarSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { tools: toolsManager, settings } = state;
  const { t } = useI18n();

  const onBack = () => {
    state.sidebar.requestedSettingsView.value = "main";
  };

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
  const { t, isRtl } = useI18n();

  const toggle = (key: "bold" | "italic" | "underline") => {
    onChange({ [key]: !section[key] } as Partial<TextSectionConfig>);
  };

  const cycleAlignment = () => {
    onChange({ alignment: ALIGNMENT_CYCLE[section.alignment] });
  };

  const alignmentIcons: Record<TextAlignment, string> = {
    unset: isRtl ? "format_align_right" : "format_align_left",
    left: "format_align_left",
    center: "format_align_center",
    right: "format_align_right",
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
          {alignmentIcons[section.alignment]}
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
          <div
            className="sb-text-format-palette"
            role="menu"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                paletteOpen.value = false;
                return;
              }
              handleGridKeyNav(event, event.currentTarget);
            }}
          >
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

function AllSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { t } = useI18n();
  const isDownloadingSettings = useSignal(false);
  const isUploadingSettings = useSignal(false);
  const uploadErrorMessage = useSignal<string>("");

  const onBack = () => {
    state.sidebar.requestedSettingsView.value = "display-and-theme";
  };

  const handleDownloadSettings = async () => {
    if (isDownloadingSettings.value) {
      return;
    }

    isDownloadingSettings.value = true;
    try {
      os.download(
        state.settings.settings.value,
        "seed-bible-app-settings.json",
        "application/json"
      );
    } finally {
      isDownloadingSettings.value = false;
    }
  };

  const handleUploadSettings = async () => {
    if (isUploadingSettings.value) {
      return;
    }

    isUploadingSettings.value = true;
    uploadErrorMessage.value = "";
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

      let jsonData: unknown;
      try {
        jsonData = JSON.parse(text);
      } catch (parseError) {
        uploadErrorMessage.value = `Invalid JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`;
        return;
      }

      const parsed = AppSettingsSchema.safeParse(jsonData);

      if (!parsed.success) {
        uploadErrorMessage.value = `Invalid app settings: ${z.prettifyError(parsed.error)}`;
        console.error("Uploaded file is not valid app settings.", parsed.error);
        return;
      }

      state.settings.setAllSettings(parsed.data);
    } catch (error) {
      uploadErrorMessage.value = `Failed to upload app settings: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error("Failed to upload app settings.", error);
    } finally {
      isUploadingSettings.value = false;
    }
  };

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("display-and-theme", { defaultValue: "Display & Theme" }),
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
      <div className="sb-extension-footer-actions">
        <button
          className="sb-settings-action-button"
          onClick={() => void handleDownloadSettings()}
          disabled={isDownloadingSettings.value}
        >
          {isDownloadingSettings.value
            ? t("downloading-settings", {
                defaultValue: "Downloading settings...",
              })
            : t("download-settings", { defaultValue: "Download settings" })}
        </button>
        <button
          className="sb-settings-action-button"
          onClick={() => void handleUploadSettings()}
          disabled={isUploadingSettings.value}
        >
          {isUploadingSettings.value
            ? t("uploading-settings", { defaultValue: "Uploading settings..." })
            : t("upload-settings", { defaultValue: "Upload settings" })}
        </button>
        {uploadErrorMessage.value && (
          <div
            className="sb-upload-settings-error"
            style={{
              color: "var(--sb-error-color, #dc2626)",
              fontSize: "13px",
              marginTop: "8px",
              wordBreak: "break-word",
            }}
          >
            {uploadErrorMessage.value}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsMainView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { t, language, availableLanguages, setLanguage } = useI18n();
  const isAwake = state.settings.settings.value.keepScreenAwake;
  const isLanguageMenuOpen = useSignal(false);
  const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

  const onNavigate = (view: RequestedSettingsView) => {
    state.sidebar.requestedSettingsView.value = view;
  };

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
              onClick={() => onNavigate("display-and-theme")}
            >
              <span className="sb-settings-nav-icon">
                <ThemeIcon />
              </span>
              <span className="sb-settings-nav-label">
                {t("display-and-theme", { defaultValue: "Display & Theme" })}
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
                  ref={languageTriggerRef}
                  type="button"
                  id="sb-language-select"
                  className="sb-settings-language-select sb-language-picker-button"
                  aria-haspopup="listbox"
                  aria-expanded={isLanguageMenuOpen.value}
                  onClick={() => {
                    isLanguageMenuOpen.value = !isLanguageMenuOpen.value;
                  }}
                  onKeyDown={(event) => {
                    handleMenuTriggerKeyDown(event, {
                      isOpen: isLanguageMenuOpen.value,
                      open: () => {
                        isLanguageMenuOpen.value = true;
                      },
                      getMenuContainer: () => languageMenuRef.current,
                    });
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
                    <div
                      ref={(el) => {
                        languageMenuRef.current = el;
                        if (el && !el.contains(document.activeElement)) {
                          const selected = el.querySelector<HTMLElement>(
                            '[role="option"][aria-selected="true"]:not([disabled])'
                          );
                          const first = el.querySelector<HTMLElement>(
                            '[role="option"]:not([disabled])'
                          );
                          (selected ?? first)?.focus();
                        }
                      }}
                      className="sb-language-picker-menu"
                      role="listbox"
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          isLanguageMenuOpen.value = false;
                          languageTriggerRef.current?.focus();
                          return;
                        }
                        handleVerticalListKeyNav(event, event.currentTarget);
                      }}
                    >
                      {availableLanguages.map((languageCode) => {
                        const meta = LANG_META[languageCode];
                        const isSelected = languageCode === language;
                        return (
                          <button
                            key={languageCode}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
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
  const currentView = state.sidebar.requestedSettingsView;

  if (currentView.value === "account") {
    return <AccountSettingsView state={state} />;
  }

  if (currentView.value === "display-and-theme") {
    return <DisplayAndThemeSettingsView state={state} />;
  }

  if (currentView.value === "display-and-theme-all-settings") {
    return <AllSettingsView state={state} />;
  }

  if (currentView.value === "toolbar") {
    return <ToolbarSettingsView state={state} />;
  }

  if (currentView.value === "extensions") {
    return <ExtensionsSettingsView state={state} />;
  }

  return <SettingsMainView state={state} />;
}
