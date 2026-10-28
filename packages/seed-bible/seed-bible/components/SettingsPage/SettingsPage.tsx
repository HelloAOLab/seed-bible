import "./SettingsPage.css";
import { localizedThemeName } from "./localizedThemeName";
import { useComputed, useSignal } from "@preact/signals";
import { ScriptureLineHeightIcon } from "../icons";
import { SearchBar } from "../SearchBar/SearchBar";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  TEXT_FONT_OPTIONS,
  TEXT_SECTION_THEME_COLOR_VAR,
  TEXT_WEIGHT_OPTIONS,
  UI_SIZE_OPTIONS,
  VERSE_LINE_HEIGHT_OPTIONS,
  DEFAULT_VERSE_LINE_HEIGHT,
  type BookOrientation,
  type TextAlignment,
  type TextSectionConfig,
  type TextSectionId,
  type TextSize,
  type UISize,
  type VerseSelectionEffects,
} from "../../managers/SettingsManager";
import {
  DARK_THEME,
  DEFAULT_HIGHLIGHT_IDS,
  LIGHT_THEME,
  SYSTEM_THEME_ID,
  THEME_COLOR_GROUPS,
  type ThemeColorKey,
} from "../../managers/ThemeManager";
import type { SeedBibleCustomization } from "../../managers/CustomizationsManager";
import { UnusedSensitiveSettingsList } from "../ExtensionSettingsForm/SensitiveSettingsForm";
import { download } from "../../app/utils";
import type { ExtensionListEntry } from "../../managers/ExtensionManager";
import { useI18n } from "../../i18n/I18nManager";
import {
  ExtensionsIcon,
  InstallAppsIcon,
  MarginIcon,
  MaterialIcon,
  ThemeIcon,
} from "../../components/icons";
import { SearchableSelect } from "../SearchableSelect/SearchableSelect";
import { handleGridKeyNav } from "../../app/keyboardNav";
import { LazyColorPicker } from "../ColorPicker/LazyColorPicker";
import { normalizeHex } from "../ColorPicker/color";
import { buildStaticPagePath } from "../../managers/StaticPagePath";
import type { RequestedSettingsView } from "../../managers/SidebarManager";

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

import { LANG_META } from "../../i18n/languageMeta";
import { useAppConfig } from "../../app/appConfig";
import { ExtensionInfoPage } from "./ExtensionInfoPage";
import { useExtensionCatalog } from "./useExtensionCatalog";

export { AddExtensionFromLink } from "./useExtensionCatalog";
import { ExtensionTile } from "../ExtensionConsentModal/ExtensionConsentModal";

function FlagImg({ cc }: { cc: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      alt=""
      style={{
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}

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
            <span className="material-symbols-outlined sb-settings-breadcrumbs-sep rtl-mirror">
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

function ThemeCardLabel(props: { name: string; isSelected: boolean }) {
  const { t } = useI18n();
  return (
    <div className="sb-theme-ready-label">
      <span>{props.name}</span>
      <span
        className={`material-symbols-outlined sb-theme-ready-check${
          props.isSelected ? "" : " sb-theme-ready-check-hidden"
        }`}
        aria-hidden={!props.isSelected}
        aria-label={
          props.isSelected
            ? t("selected", { defaultValue: "Selected" })
            : undefined
        }
      >
        check_circle
      </span>
    </div>
  );
}

function ThemesGallerySection(props: { state: SeedBibleState }) {
  const { themes, selectedThemeId, setTheme } = props.state.theme;
  const { t } = useI18n();

  if (themes.value.length <= 1) {
    return null;
  }

  return (
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
              <ThemeCardLabel
                name={localizedThemeName(t, theme)}
                isSelected={isSelected}
              />
            </button>
          );
        })}
        <button
          type="button"
          className={`sb-theme-ready-card${
            selectedThemeId.value === SYSTEM_THEME_ID
              ? " sb-theme-ready-card-selected"
              : ""
          }`}
          onClick={() => setTheme(SYSTEM_THEME_ID)}
        >
          <div className="sb-theme-ready-preview sb-theme-ready-preview-system">
            {[LIGHT_THEME, DARK_THEME].map((half) => (
              <div
                key={half.id}
                className="sb-theme-ready-system-half"
                style={{
                  background:
                    half.variables.readerBackground ??
                    half.variables.background,
                }}
              >
                <div
                  className="sb-theme-ready-swatch sb-theme-ready-swatch-a"
                  style={{ background: half.variables.primaryColor }}
                />
              </div>
            ))}
          </div>
          <ThemeCardLabel
            name={localizedThemeName(t, {
              id: SYSTEM_THEME_ID,
              name: "System",
            })}
            isSelected={selectedThemeId.value === SYSTEM_THEME_ID}
          />
        </button>
      </div>
    </section>
  );
}

export function CustomizationVariantGallery(props: {
  state: SeedBibleState;
  customization: SeedBibleCustomization;
}) {
  const { state, customization } = props;
  const { customizations } = state;
  const { t } = useI18n();

  return (
    <section className="sb-settings-section">
      <h3 className="sb-settings-subheading">
        {t("variants", { defaultValue: "Themes" })}
      </h3>
      <div
        className="sb-theme-ready-gallery"
        role="radiogroup"
        onKeyDown={(event) => {
          handleGridKeyNav(event, event.currentTarget);
        }}
      >
        {customization.variants.map((variant) => {
          const isSelected =
            !customizations.isFollowingSystemScheme.value &&
            variant.id === customizations.activeVariant.value?.id;
          // `variant.themes` holds only the fields this theme overrides;
          // everything else comes from the preset it's based on.
          const colors =
            customizations.resolveEditingVariantTheme(variant).variables;
          return (
            <button
              key={variant.id}
              type="button"
              className={`sb-theme-ready-card${
                isSelected ? " sb-theme-ready-card-selected" : ""
              }`}
              onClick={() =>
                void customizations.selectActiveVariant(variant.id)
              }
            >
              <div
                className="sb-theme-ready-preview"
                style={{ background: colors.tertiaryColor }}
              >
                <div
                  className="sb-theme-ready-swatch sb-theme-ready-swatch-a"
                  style={{ background: colors.primaryColor }}
                />
                <div
                  className="sb-theme-ready-swatch sb-theme-ready-swatch-b"
                  style={{ background: colors.secondaryColor }}
                />
                <div
                  className="sb-theme-ready-swatch sb-theme-ready-swatch-c"
                  style={{ background: colors.fontColor }}
                />
              </div>
              <ThemeCardLabel name={variant.name} isSelected={isSelected} />
            </button>
          );
        })}
        {customizations.canFollowSystemScheme.value && (
          <CustomizationSystemCard
            state={state}
            customization={customization}
          />
        )}
      </div>
    </section>
  );
}

/**
 * Follows the device between a customization's Light-based and Dark-based
 * variants instead of pinning one. Rendered only when it has both — see
 * `canFollowSystemScheme`.
 */
function CustomizationSystemCard(props: {
  state: SeedBibleState;
  customization: SeedBibleCustomization;
}) {
  const { customizations } = props.state;
  const { t } = useI18n();
  const isSelected = customizations.isFollowingSystemScheme.value;
  const halves = [LIGHT_THEME.id, DARK_THEME.id].map((presetId) => {
    const variant = props.customization.variants.find(
      (v) => v.baseTheme === presetId
    );
    return {
      presetId,
      colors: variant
        ? customizations.resolveEditingVariantTheme(variant).variables
        : undefined,
    };
  });

  return (
    <button
      type="button"
      className={`sb-theme-ready-card${
        isSelected ? " sb-theme-ready-card-selected" : ""
      }`}
      onClick={() => void customizations.selectActiveVariant(SYSTEM_THEME_ID)}
    >
      <div className="sb-theme-ready-preview sb-theme-ready-preview-system">
        {halves.map(({ presetId, colors }) => (
          <div
            key={presetId}
            className="sb-theme-ready-system-half"
            style={{ background: colors?.tertiaryColor }}
          >
            <div
              className="sb-theme-ready-swatch sb-theme-ready-swatch-a"
              style={{ background: colors?.primaryColor }}
            />
          </div>
        ))}
      </div>
      <ThemeCardLabel
        name={localizedThemeName(t, { id: SYSTEM_THEME_ID, name: "System" })}
        isSelected={isSelected}
      />
    </button>
  );
}

function DisplayAndThemeSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const settings = state.settings;
  const { setFontSize } = settings;
  const current = settings.settings.value;
  const selectedFontSize = current.fontSize;
  const isMobile = state.app.isMobile.value;

  const verseConfig = settings.settings.value.textConfig.verse;
  const currentScriptureWidth = settings.settings.value.scriptureWidth;
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

  const setScriptureWidth = (next: number) => {
    settings.setScriptureWidth(next);
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

      {state.customizations.activeCustomization.value ? (
        <CustomizationVariantGallery
          state={state}
          customization={state.customizations.activeCustomization.value}
        />
      ) : (
        <ThemesGallerySection state={state} />
      )}

      <section className="sb-settings-section">
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
              {t("scripture-width", { defaultValue: "Scripture Width" })}
            </div>
            <div className="sb-scripture-margins-row">
              <button
                type="button"
                className="sb-scripture-margins-step"
                onClick={() => setScriptureWidth(currentScriptureWidth - 1)}
                aria-label={t("decrease-scripture-width", {
                  defaultValue: "Decrease scripture width",
                })}
              >
                −
              </button>
              <div className="sb-scripture-margins-value">
                <input
                  type="number"
                  className="sb-scripture-margins-input"
                  value={currentScriptureWidth}
                  min={24}
                  max={192}
                  onInput={(event: Event) => {
                    const target = event.currentTarget as HTMLInputElement;
                    const parsed = Number(target.value);
                    if (Number.isFinite(parsed)) setScriptureWidth(parsed);
                  }}
                />
                <span className="sb-scripture-margins-unit">
                  {t("scripture-width-unit", { defaultValue: "ch" })}
                </span>
              </div>
              <button
                type="button"
                className="sb-scripture-margins-step"
                onClick={() => setScriptureWidth(currentScriptureWidth + 1)}
                aria-label={t("increase-scripture-width", {
                  defaultValue: "Increase scripture width",
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
          {t("discovered-content", { defaultValue: "Discovered Content" })}
        </h3>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-show-discovered-content"
          >
            {t("show-discovered-content", {
              defaultValue: "Show discovered content",
            })}
          </label>
          <input
            id="sb-show-discovered-content"
            type="checkbox"
            checked={current.discoveredContent.showContent}
            onChange={(event: Event) => {
              settings.setDiscoveredContent({
                showContent: (event.currentTarget as HTMLInputElement).checked,
              });
            }}
          />
        </div>
        <h3 className="sb-settings-subheading">
          {t("session", { defaultValue: "Session" })}
        </h3>
        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-verse-selection-effects"
          >
            {t("verse-selection-effects", {
              defaultValue: "Verse Selection Effects",
            })}
          </label>

          <select
            id="sb-verse-selection-effects"
            className="sb-settings-language-select"
            value={current.verseSelectionEffects ?? "default"}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;

              settings.setVerseSelectionEffects(
                target.value as VerseSelectionEffects
              );
            }}
          >
            <option value="default">
              {t("default", { defaultValue: "Default" })}
            </option>
            <option value="enabled">
              {t("enabled", { defaultValue: "Enabled" })}
            </option>
            <option value="disabled">
              {t("disabled", { defaultValue: "Disabled" })}
            </option>
          </select>
        </div>
        <h3 className="sb-settings-subheading">
          {t("display", { defaultValue: "Display" })}
        </h3>

        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-ui-size-select"
          >
            {t("ui-size", { defaultValue: "UI size" })}
          </label>
          <select
            id="sb-ui-size-select"
            className="sb-settings-language-select"
            value={current.uiSize}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              settings.setUISize(target.value as UISize);
            }}
          >
            {UI_SIZE_OPTIONS.map((size) => (
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
        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-keep-screen-awake"
          >
            {t("keep-screen-awake", { defaultValue: "Keep screen awake" })}
          </label>
          <input
            id="sb-keep-screen-awake"
            type="checkbox"
            checked={current.keepScreenAwake}
            onChange={(event: Event) => {
              settings.setKeepScreenAwake(
                (event.currentTarget as HTMLInputElement).checked
              );
            }}
          />
        </div>

        <div className="sb-settings-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-ask-to-switch-ui-language"
          >
            {t("ask-to-switch-ui-language", {
              defaultValue: "Offer to switch language with translation",
            })}
          </label>
          <input
            id="sb-ask-to-switch-ui-language"
            type="checkbox"
            checked={current.askToSwitchUiLanguage}
            onChange={(event: Event) => {
              settings.setAskToSwitchUiLanguage(
                (event.currentTarget as HTMLInputElement).checked
              );
            }}
          />
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

        <button
          type="button"
          className="sb-settings-nav-item"
          onClick={onOpenAllSettings}
        >
          <span>{t("all-settings", { defaultValue: "All settings" })}</span>
          <span className="material-symbols-outlined rtl-mirror">
            chevron_right
          </span>
        </button>
      </section>
    </div>
  );
}

function ExtensionsSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { extensions, extensionSettings } = state;
  const { t } = useI18n();
  const catalog = useExtensionCatalog(state);
  const { activeCustomization, nameOf, descriptionOf } = catalog;
  const searchQuery = useSignal("");
  // The extension whose page is open, in place of the list.
  const openExtensionId = useSignal<string | null>(null);

  const onBack = () => {
    state.sidebar.requestedSettingsView.value = "main";
  };

  const renderExtensionRow = (extensionEntry: ExtensionListEntry) => {
    const { id } = extensionEntry;
    const name = nameOf(id);
    const description = descriptionOf(id);
    return (
      <li key={id}>
        <button
          type="button"
          className="sb-extensions-item"
          onClick={() => (openExtensionId.value = id)}
        >
          <ExtensionTile
            request={{
              extensionId: id,
              title: name,
              icon: extensionEntry.extension?.meta.icon,
            }}
          />
          <span className="sb-extensions-item-content">
            <span className="sb-extensions-item-title">
              <span className="sb-extensions-item-name">{name}</span>
              {catalog.isBuiltIn(extensionEntry) && (
                <span className="sb-extensions-item-tag">
                  {t("extension-info-built-in-tag")}
                </span>
              )}
              {catalog.installStateOf(extensionEntry) === "pending" && (
                <span className="sb-extensions-item-tag">
                  {t("extension-state-pending", {
                    defaultValue: "Installing…",
                  })}
                </span>
              )}
            </span>
            {description && (
              <span className="sb-extensions-item-description">
                {description}
              </span>
            )}
          </span>
          <span
            className="material-symbols-outlined sb-extensions-item-chevron rtl-mirror"
            aria-hidden="true"
          >
            chevron_right
          </span>
        </button>
      </li>
    );
  };

  const query = searchQuery.value.trim();
  const shownExtensions = catalog.entries.filter((entry) =>
    catalog.matches(entry, query)
  );
  const installedExtensions = shownExtensions.filter((e) => e.installed);
  const availableExtensions = shownExtensions.filter((e) => !e.installed);

  const renderSection = (
    key: "installed" | "available",
    title: string,
    entries: ExtensionListEntry[],
    emptyMessage: string
  ) => {
    // While searching, a section with no matches is left out.
    if (query && entries.length === 0) {
      return null;
    }
    return (
      <section
        className="sb-extensions-section"
        aria-labelledby={`sb-extensions-${key}-title`}
      >
        <h2
          id={`sb-extensions-${key}-title`}
          className="sb-extensions-section-title"
        >
          {title}
        </h2>
        {entries.length === 0 ? (
          <div className="sb-settings-empty-state">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <ul className="sb-extensions-group">
            {entries.map(renderExtensionRow)}
          </ul>
        )}
      </section>
    );
  };

  const openAddFromLink = () =>
    catalog.openAddFromLink((extensionId) => {
      searchQuery.value = "";
      openExtensionId.value = extensionId;
    });

  const openEntry = catalog.entries.find(
    (entry) => entry.id === openExtensionId.value
  );
  if (openEntry) {
    const name = nameOf(openEntry.id);
    return (
      <ExtensionInfoPage
        entry={openEntry}
        name={name}
        description={descriptionOf(openEntry.id)}
        installState={catalog.installStateOf(openEntry)}
        extensions={extensions}
        people={catalog.people}
        breadcrumbs={
          <SettingsBreadcrumbs
            onBack={() => (openExtensionId.value = null)}
            trail={[
              t("page-settings", { defaultValue: "Page settings" }),
              t("extensions", { defaultValue: "Extensions" }),
              name,
            ]}
          />
        }
        onInstall={() => void catalog.install(openEntry.id)}
        onUninstall={() => catalog.uninstall(openEntry.id)}
        settings={catalog.renderSettings(openEntry)}
      />
    );
  }

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
        {activeCustomization && (
          <p className="sb-settings-field-description">
            {t("extensions-for-active-customization-scoped", {
              defaultValue:
                "Showing extensions for {{name}}. Changes you make here only apply while you're using it.",
              name: activeCustomization.name,
            })}
          </p>
        )}
        {catalog.entries.length === 0 ? (
          <div className="sb-settings-empty-state">
            <p>
              {t("no-extensions-available", {
                defaultValue: "No extensions available.",
              })}
            </p>
          </div>
        ) : (
          <>
            <SearchBar
              value={searchQuery.value}
              onInput={(value) => {
                searchQuery.value = value;
              }}
              placeholder={t("extensions-search")}
            />
            {query && shownExtensions.length === 0 ? (
              <div className="sb-settings-empty-state" role="status">
                <p>
                  {t("extensions-search-no-matches", {
                    query: searchQuery.value.trim(),
                  })}
                </p>
              </div>
            ) : (
              <>
                {renderSection(
                  "installed",
                  t("installed-extensions", { defaultValue: "Installed" }),
                  installedExtensions,
                  t("no-installed-extensions", {
                    defaultValue: "You haven't installed any extensions yet.",
                  })
                )}
                {renderSection(
                  "available",
                  t("available-extensions", { defaultValue: "Available" }),
                  availableExtensions,
                  t("no-available-extensions", {
                    defaultValue:
                      "There are no more extensions available to install.",
                  })
                )}
              </>
            )}
          </>
        )}

        <UnusedSensitiveSettingsList
          unused={extensionSettings.getUnusedSensitiveProxies()}
          getExtensionTitle={(extensionId) =>
            // eslint-disable-next-line seed-bible-i18n/translation-missing-keys
            t("title", { ns: extensionId, defaultValue: extensionId })
          }
          onClear={(extensionId, proxyId) =>
            extensionSettings.clearSensitiveValues(extensionId, proxyId)
          }
          t={t}
        />

        <button
          type="button"
          className="sb-extensions-add-link-button"
          onClick={openAddFromLink}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            link
          </span>
          {t("extension-add-link-label")}
        </button>
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
            <div className="sb-text-format-palette-custom">
              <span>{t("custom", { defaultValue: "Custom" })}</span>
              <LazyColorPicker
                value={normalizeHex(section.color)}
                className="sb-text-format-palette-custom-swatch"
                ariaLabel={t("custom", { defaultValue: "Custom" })}
                onChange={(color) => {
                  onChange({ color });
                  paletteOpen.value = false;
                }}
              />
            </div>
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
              const hexValue = normalizeHex(
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
                    <LazyColorPicker
                      value={hexValue}
                      className="sb-theme-color-input"
                      ariaLabel={field.label}
                      onChange={(color) => {
                        theme.setCustomColor(field.key, color);
                      }}
                      onPreview={(color) => {
                        theme.previewCustomColor(field.key, color);
                      }}
                      onCancel={() => {
                        theme.clearPreviewCustomColor(field.key);
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
                <LazyColorPicker
                  value={normalizeHex(bg)}
                  className="sb-theme-color-input"
                  ariaLabel={t("id_highlight-background-color", { id })}
                  onChange={(color) => {
                    theme.setHighlightColor(id, { color });
                  }}
                  onPreview={(color) => {
                    theme.previewHighlightColor(id, { color });
                  }}
                  onCancel={() => {
                    theme.clearPreviewHighlightField(id, "color");
                  }}
                />
                <LazyColorPicker
                  value={normalizeHex(fg)}
                  className="sb-theme-color-input"
                  ariaLabel={t("id_highlight-text-color", { id })}
                  onChange={(color) => {
                    theme.setHighlightColor(id, { fontColor: color });
                  }}
                  onPreview={(color) => {
                    theme.previewHighlightColor(id, { fontColor: color });
                  }}
                  onCancel={() => {
                    theme.clearPreviewHighlightField(id, "fontColor");
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
      download(
        new Blob([JSON.stringify(state.settings.settings.value, null, 2)], {
          type: "application/json",
        }),
        "seed-bible-app-settings.json"
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
      // TODO: Fix this
      // const files = await os.showUploadFiles();
      // const firstFile = files?.[0];
      // if (!firstFile) {
      //   return;
      // }
      // const text =
      //   typeof firstFile.data === "string"
      //     ? firstFile.data
      //     : new TextDecoder().decode(firstFile.data);
      // let jsonData: unknown;
      // try {
      //   jsonData = JSON.parse(text);
      // } catch (parseError) {
      //   uploadErrorMessage.value = `Invalid JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`;
      //   return;
      // }
      // const parsed = AppSettingsSchema.safeParse(jsonData);
      // if (!parsed.success) {
      //   uploadErrorMessage.value = `Invalid app settings: ${z.prettifyError(parsed.error)}`;
      //   console.error("Uploaded file is not valid app settings.", parsed.error);
      //   return;
      // }
      // state.settings.setAllSettings(parsed.data);
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
      {state.customizations.activeCustomization.value ? (
        <section className="sb-settings-section">
          <div className="sb-settings-empty-state">
            <p>
              {t("colors-controlled-by-customization", {
                defaultValue:
                  "Colors are controlled by the active Custom Branding. Change which theme you're using from Display & Theme.",
              })}
            </p>
            <button
              type="button"
              className="sb-settings-action-button"
              onClick={() => {
                state.sidebar.requestedSettingsView.value = "display-and-theme";
              }}
            >
              {t("go-to-display-and-theme", {
                defaultValue: "Go to Display & Theme",
              })}
            </button>
          </div>
        </section>
      ) : (
        <ThemeCustomColorsContent state={state} />
      )}
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
              fontSize: "0.8125rem",
              marginTop: "0.5rem",
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

function SettingsVersionFooter() {
  const { t } = useI18n();
  const copied = useSignal(false);

  const onCopy = () => {
    navigator.clipboard
      ?.writeText(`v${__APP_VERSION__} (${__GIT_COMMIT__})`)
      .then(() => {
        copied.value = true;
        setTimeout(() => {
          copied.value = false;
        }, 1500);
      })
      .catch(() => {
        // Clipboard write was denied/unsupported — leave the label unchanged
        // rather than falsely reporting success.
      });
  };

  return (
    <button
      type="button"
      className="sb-settings-version"
      onClick={onCopy}
      title={t("copy", { defaultValue: "Copy" })}
    >
      {copied.value
        ? t("copied", { defaultValue: "Copied" })
        : t("app-version", {
            version: __APP_VERSION__,
            commit: __GIT_COMMIT__.slice(0, 7),
            defaultValue: "v{{version}} · {{commit}}",
          })}
    </button>
  );
}

function SettingsMainView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { branding } = useAppConfig();
  const { t, language, availableLanguages, setLanguage } = useI18n();

  const onNavigate = (view: RequestedSettingsView) => {
    state.sidebar.requestedSettingsView.value = view;
  };
  const disabledSettings = branding?.disabledSettings ?? [];

  const isSettingDisabled = (id: string) => disabledSettings.includes(id);

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
              onClick={() => {
                // One history entry, so Back from Profile returns to Settings.
                state.navigation.batchWrites(() => {
                  state.sidebar.closeSettings();
                  state.openProfile();
                });
              }}
            >
              <span className="sb-settings-nav-icon">
                <MaterialIcon>person</MaterialIcon>
              </span>
              <span className="sb-settings-nav-label">
                {t("account", { defaultValue: "Account" })}
              </span>
              <span className="material-symbols-outlined rtl-mirror">
                chevron_right
              </span>
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
              <span className="material-symbols-outlined rtl-mirror">
                chevron_right
              </span>
            </button>
          </li>
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() =>
                // A phone has no room beside the sidebar for the full page.
                state.app.isMobile.value
                  ? onNavigate("extensions")
                  : state.openExtensions()
              }
            >
              <span className="sb-settings-nav-icon">
                <ExtensionsIcon />
              </span>
              <span className="sb-settings-nav-label">
                {t("extensions", { defaultValue: "Extensions" })}
              </span>
              <span className="material-symbols-outlined rtl-mirror">
                chevron_right
              </span>
            </button>
          </li>
          {/* Shown in normal browser tabs when not already treated as installed.
              installed is session-only (standalone, or markInstalled this load) —
              not localStorage/profile — so uninstalling the PWA brings this back. */}
          {!state.onboarding.installed.value && (
            <li>
              <button
                className="sb-settings-nav-item"
                onClick={() => state.onboarding.openInstall()}
              >
                <span className="sb-settings-nav-icon">
                  <InstallAppsIcon size={24} />
                </span>
                <span className="sb-settings-nav-label">
                  {t("install-app", { defaultValue: "Install app" })}
                </span>
                <span className="material-symbols-outlined rtl-mirror">
                  chevron_right
                </span>
              </button>
            </li>
          )}
          <li>
            <button
              className="sb-settings-nav-item"
              onClick={() => {
                state.sidebar.closeSettings();
                state.tutorial.start();
              }}
            >
              <span className="sb-settings-nav-icon">
                <MaterialIcon>school</MaterialIcon>
              </span>
              <span className="sb-settings-nav-label">
                {t("launch-tutorial", { defaultValue: "Launch tutorial" })}
              </span>
              <span className="material-symbols-outlined rtl-mirror">
                chevron_right
              </span>
            </button>
          </li>
          {!isSettingDisabled("about-seed-bible") && (
            <li>
              <button
                className="sb-settings-nav-item"
                onClick={() => {
                  state.sidebar.closeSettings();
                  state.navigation.push(
                    buildStaticPagePath({
                      language: state.i18n.language.value,
                      page: "about",
                    })
                  );
                }}
              >
                <span className="sb-settings-nav-icon">
                  <MaterialIcon>info</MaterialIcon>
                </span>
                <span className="sb-settings-nav-label">
                  {t("about-title", { defaultValue: "About Seed Bible" })}
                </span>
                <span className="material-symbols-outlined rtl-mirror">
                  chevron_right
                </span>
              </button>
            </li>
          )}
          <li>
            <div className="sb-settings-field-row">
              <span className="sb-settings-field-label">
                {t("language", { defaultValue: "Language" })}
              </span>
              <SearchableSelect
                id="sb-language-select"
                buttonClassName="sb-settings-language-select"
                value={language}
                options={availableLanguages.map((languageCode) => {
                  const meta = LANG_META[languageCode];
                  return {
                    id: languageCode,
                    label: meta?.display ?? languageCode.toUpperCase(),
                    leading:
                      meta?.cc && meta.cc.length > 0 ? (
                        <FlagImg cc={meta.cc} />
                      ) : undefined,
                  };
                })}
                onChange={(languageCode) => {
                  void setLanguage(languageCode);
                }}
                searchPlaceholder={t("search-languages", {
                  defaultValue: "Search languages...",
                })}
                emptyLabel={t("no-languages-found", {
                  defaultValue: "No languages found",
                })}
              />
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
        <SettingsVersionFooter />
      </section>
    </div>
  );
}

export function SettingsPage(props: { state: SeedBibleState }) {
  const { state } = props;
  // Honor a deep-link requested by the sidebar (e.g. `?settingsView=extensions`).
  const currentView = state.sidebar.requestedSettingsView;

  if (currentView.value === "display-and-theme") {
    return <DisplayAndThemeSettingsView state={state} />;
  }

  if (currentView.value === "display-and-theme-all-settings") {
    return <AllSettingsView state={state} />;
  }

  if (currentView.value === "extensions") {
    return <ExtensionsSettingsView state={state} />;
  }

  return <SettingsMainView state={state} />;
}
