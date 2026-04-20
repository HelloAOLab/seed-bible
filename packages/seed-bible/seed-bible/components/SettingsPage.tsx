import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { TextSize } from "seed-bible.managers.ConfigManager";
import {
  TEXT_FONT_OPTIONS,
  TEXT_SECTION_LABELS,
  TEXT_WEIGHT_OPTIONS,
  UI_TEXT_SIZE_OPTIONS,
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
  MaterialIcon,
  TheNewSettingsIcon,
  ThemeIcon,
} from "seed-bible.components.icons";

type SettingsView =
  | null
  | "account"
  | "theme"
  | "theme-colors"
  | "text"
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

function SettingsBreadcrumbs(props: { onBack: () => void; trail: string[] }) {
  return (
    <div className="sb-settings-breadcrumbs">
      <button
        className="sb-settings-breadcrumbs-back"
        onClick={props.onBack}
        aria-label="Back"
        title="Back"
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
  onOpenColorPicker: () => void;
}) {
  const { state, onBack, onOpenColorPicker } = props;
  const { themes, selectedThemeId, setTheme } = state.theme;
  const { config, setFontSize } = state.config;
  const selectedFontSize = config.value.fontSize;

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs onBack={onBack} trail={["Page settings", "Theme"]} />
      <SettingsHero
        icon="palette"
        title="Theme"
        description="Pick a ready-made theme or customize the look of the app."
      />

      <section className="sb-settings-section">
        <h3 className="sb-settings-subheading">Ready themes</h3>
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
                      aria-label="Selected"
                    >
                      check_circle
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <h3 className="sb-settings-subheading">Reader font size</h3>
        <div className="sb-settings-field-row">
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

        <h3 className="sb-settings-subheading">Advanced</h3>
        <button
          type="button"
          className="sb-settings-nav-item"
          onClick={onOpenColorPicker}
        >
          <span>Customize colors</span>
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
      <SettingsSubPageHeader title="Extensions" onBack={onBack} />
      <section className="sb-settings-section">
        {extensionsList.length === 0 ? (
          <div className="sb-settings-empty-state">
            <p>No extensions available.</p>
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
                        {/* eslint-disable-next-line seed-bible-i18n/translation-missing-keys */}
                        {t("description", { ns: id, defaultValue: "" })}
                      </span>
                    </div>
                  </button>

                  <ContextMenuWithButton>
                    {installState === "none" && (
                      <ContextMenuItem onClick={() => void handleInstall(id)}>
                        Install
                      </ContextMenuItem>
                    )}
                    {(installState === "installed" ||
                      installState === "downloaded") && (
                      <ContextMenuItem onClick={() => handleUninstall(id)}>
                        Uninstall
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
        title="Toolbar"
        description="Choose which reader toolbar tools appear and in what order."
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
              Reset toolbar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function TextFormattingToolbar(props: {
  section: TextSectionConfig;
  onChange: (patch: Partial<TextSectionConfig>) => void;
}) {
  const { section, onChange } = props;
  const paletteOpen = useSignal(false);

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
        aria-label="Bold"
        aria-pressed={section.bold}
      >
        <span className="material-symbols-outlined">format_bold</span>
      </button>
      <button
        type="button"
        className={`sb-text-format-btn${section.italic ? " sb-text-format-btn-active" : ""}`}
        onClick={() => toggle("italic")}
        aria-label="Italic"
        aria-pressed={section.italic}
      >
        <span className="material-symbols-outlined">format_italic</span>
      </button>
      <button
        type="button"
        className={`sb-text-format-btn${section.underline ? " sb-text-format-btn-active" : ""}`}
        onClick={() => toggle("underline")}
        aria-label="Underline"
        aria-pressed={section.underline}
      >
        <span className="material-symbols-outlined">format_underlined</span>
      </button>

      <div className="sb-text-format-divider" aria-hidden="true" />

      <button
        type="button"
        className="sb-text-format-btn"
        onClick={cycleAlignment}
        aria-label={`Alignment: ${section.alignment}`}
        title="Cycle alignment"
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
          aria-label="Pick text color"
          title="Text color"
        >
          <span
            className="sb-text-format-color-swatch"
            style={{ background: section.color }}
          />
        </button>
        {paletteOpen.value && (
          <div className="sb-text-format-palette" role="menu">
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
              <span>Custom</span>
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

function TextSettingsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { settings } = state;
  const textConfig = settings.settings.value.textConfig;

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs onBack={onBack} trail={["Page settings", "Text"]} />
      <SettingsHero
        icon="text_fields"
        title="Text"
        description="Settings for the text on page."
      />

      <section className="sb-settings-section">
        {TEXT_SECTION_ORDER.map((section) => {
          const config = textConfig[section];
          const handleChange = (patch: Partial<TextSectionConfig>) =>
            settings.updateTextSection(section, patch);

          return (
            <div key={section} className="sb-text-section">
              <h3 className="sb-text-section-title">
                {TEXT_SECTION_LABELS[section]} Text
              </h3>

              <div className="sb-settings-field-row">
                <label className="sb-settings-field-label">Font</label>
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
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sb-settings-field-row">
                <label className="sb-settings-field-label">Weight</label>
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
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sb-settings-field-row">
                <label className="sb-settings-field-label">
                  Margin (vertical, px)
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
                  Margin (horizontal, px)
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

              <TextFormattingToolbar section={config} onChange={handleChange} />
            </div>
          );
        })}

        <div className="sb-settings-actions">
          <button
            type="button"
            className="sb-settings-action-button"
            onClick={() => settings.resetTextConfig()}
          >
            Reset text settings
          </button>
        </div>
      </section>
    </div>
  );
}

function ThemeCustomColorsView(props: {
  state: SeedBibleState;
  onBack: () => void;
}) {
  const { state, onBack } = props;
  const { theme } = state;

  const effectiveTheme = useComputed(() => theme.currentTheme.value);
  const overrides = useComputed(() => theme.customOverrides.value);
  const hasOverrides = useComputed(
    () => Object.keys(theme.customOverrides.value).length > 0
  );

  return (
    <div className="sb-settings-page">
      <SettingsSubPageHeader title="Customize colors" onBack={onBack} />
      <section className="sb-settings-section">
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
                      <span className="sb-theme-color-label">
                        {field.label}
                      </span>
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
                          const target =
                            event.currentTarget as HTMLInputElement;
                          theme.setCustomColor(field.key, target.value);
                        }}
                      />
                      {isOverridden && (
                        <button
                          type="button"
                          className="sb-theme-color-reset"
                          title="Reset to preset"
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

        <h3 className="sb-settings-subheading">Highlight colors</h3>
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
                    aria-label={`${id} background color`}
                    title="Highlight background"
                    onInput={(event: Event) => {
                      const target = event.currentTarget as HTMLInputElement;
                      theme.setHighlightColor(id, { color: target.value });
                    }}
                  />
                  <input
                    type="color"
                    className="sb-theme-color-input"
                    value={toHexInputValue(fg)}
                    aria-label={`${id} text color`}
                    title="Highlight text"
                    onInput={(event: Event) => {
                      const target = event.currentTarget as HTMLInputElement;
                      theme.setHighlightColor(id, { fontColor: target.value });
                    }}
                  />
                  {isOverridden && (
                    <button
                      type="button"
                      className="sb-theme-color-reset"
                      title="Reset to preset"
                      aria-label={`Reset ${id}`}
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
              Reset all custom colors
            </button>
          </div>
        )}
      </section>
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

  return (
    <div className="sb-settings-page">
      <SettingsSubPageHeader title="Display" onBack={onBack} />
      <section className="sb-settings-section">
        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-ui-text-size-select"
          >
            UI text size
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
            Book order
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
            <option value="traditional">Traditional</option>
            <option value="tanak">TaNaK</option>
          </select>
        </div>

        <h3 className="sb-settings-subheading">Selection UI</h3>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-selected-items"
          >
            Show selected items
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
            Show highlight colors
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
            Show icon text
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
  const { language, availableLanguages, setLanguage } = useI18n();
  const isAwake = state.settings.settings.value.keepScreenAwake;

  const handleWakeLockToggle = (checked: boolean) => {
    state.settings.setKeepScreenAwake(checked);
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
              <span className="sb-settings-nav-icon">
                <MaterialIcon>person</MaterialIcon>
              </span>
              <span className="sb-settings-nav-label">Account settings</span>
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
              <span className="sb-settings-nav-label">Theme</span>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </li>
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => onNavigate("text")}
            >
              <span className="sb-settings-nav-icon">
                <MaterialIcon>text_fields</MaterialIcon>
              </span>
              <span className="sb-settings-nav-label">Text</span>
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
              <span className="sb-settings-nav-label">Toolbar</span>
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
              <span className="sb-settings-nav-label">Extensions</span>
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
              <span className="sb-settings-nav-label">Display</span>
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
        onOpenColorPicker={() => {
          currentView.value = "theme-colors";
        }}
      />
    );
  }

  if (currentView.value === "theme-colors") {
    return (
      <ThemeCustomColorsView
        state={state}
        onBack={() => {
          currentView.value = "theme";
        }}
      />
    );
  }

  if (currentView.value === "text") {
    return (
      <TextSettingsView
        state={state}
        onBack={() => {
          currentView.value = null;
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
