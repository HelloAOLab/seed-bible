import "./SettingsPage.css";
import { localizedThemeName } from "./localizedThemeName";
import { useComputed, useSignal } from "@preact/signals";
import { ScriptureLineHeightIcon } from "../icons";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  UI_SIZE_OPTIONS,
  VERSE_LINE_HEIGHT_OPTIONS,
  type BookOrientation,
  type TextSize,
  type UISize,
  type VerseSelectionEffects,
} from "../../managers/SettingsManager";
import {
  DARK_THEME,
  LIGHT_THEME,
  SYSTEM_THEME_ID,
} from "../../managers/ThemeManager";
import {
  CUSTOMIZATION_FONT_PRESETS,
  type SeedBibleCustomization,
} from "../../managers/CustomizationsManager";
import {
  buildCustomizationTutorialSteps,
  openCustomizationEditPane,
} from "../CustomizationEditPane/CustomizationEditPane";
import {
  CustomizationCardPreview,
  getDefaultTranslationLabel,
} from "../CustomizationEditPane/CustomizationPreviews";
import { UnusedSensitiveSettingsList } from "../ExtensionSettingsForm/SensitiveSettingsForm";
import { download, translateTitle } from "../../app/utils";
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
import { buildStaticPagePath } from "../../managers/StaticPagePath";
import { useEffect } from "preact/hooks";
import type { RequestedSettingsView } from "../../managers/SidebarManager";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";

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

  const currentScriptureWidth = settings.settings.value.scriptureWidth;
  const currentLineHeight = settings.settings.value.verseLineHeight;
  const lineHeightIndex = (() => {
    const idx = VERSE_LINE_HEIGHT_OPTIONS.indexOf(currentLineHeight);
    return idx === -1 ? 0 : idx;
  })();
  const fontSizeIndex = FONT_SIZE_OPTIONS.indexOf(selectedFontSize);

  const onBack = () => {
    state.sidebar.requestedSettingsView.value = "main";
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
    const idx = VERSE_LINE_HEIGHT_OPTIONS.indexOf(
      settings.settings.value.verseLineHeight
    );
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

        <div className="sb-settings-field-row">
          <label className="sb-settings-field-label" htmlFor="sb-font-select">
            {t("scripture-font", { defaultValue: "Scripture Font" })}
          </label>
          <select
            id="sb-font-select"
            className="sb-settings-language-select"
            value={current.fontOverride ?? "default"}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              if (target.value === "default") {
                settings.setFontOverride(undefined);
              } else {
                settings.setFontOverride(target.value);
              }
            }}
          >
            {[
              {
                value: "default",
                name: t("default", { defaultValue: "Default" }),
              },
              ...CUSTOMIZATION_FONT_PRESETS,
            ].map((option) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

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
            <label className="sb-extensions-search">
              <span className="material-symbols-outlined" aria-hidden="true">
                search
              </span>
              <input
                type="search"
                value={searchQuery.value}
                onInput={(event) =>
                  (searchQuery.value = event.currentTarget.value)
                }
                placeholder={t("extensions-search")}
                aria-label={t("extensions-search")}
              />
            </label>
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
    // Ignore the order for now as pr Issue #1384
    // ...toolbarConfig.order.filter((id) => allIds.includes(id)),
    ...allIds.filter((id) => !toolbarConfig.order.includes(id)),
  ];

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
          {orderedIds.map((id) => {
            const tool = available.find((entry) => entry.id === id);
            if (!tool || !tool.isControllable) return null;
            const title = translateTitle(t, tool.title);
            const isHidden = hiddenSet.has(id);

            return (
              <li
                key={id}
                className={`sb-toolbar-config-row${
                  isHidden ? " sb-toolbar-config-row-hidden" : ""
                }`}
              >
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

function CustomizationsSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customizations } = state;
  const { t } = useI18n();

  useEffect(() => {
    void customizations.load();
  }, []);

  const onBack = () => {
    state.sidebar.requestedSettingsView.value = "main";
  };

  const openCustomization = (id: string) => {
    openCustomizationEditPane(state, id);
  };

  const handleCreate = async () => {
    const created = await customizations.create();
    openCustomizationEditPane(state, created.id);
    // First-time-only overview: the customization name and logo, then a
    // deep-linked tour of the new theme's editor sections.
    state.tutorial.startContextual(
      "customization-created",
      buildCustomizationTutorialSteps(state, created.defaultVariantId)
    );
  };

  const list = customizations.customizations.value;
  const isEmpty = list.length === 0;

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={onBack}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          t("customize", { defaultValue: "Customize" }),
        ]}
      />
      <section className="sb-settings-section">
        <p className="sb-cz-intro">
          {t("customizations-description", {
            defaultValue:
              "A customization bundles a logo, themes and extension rules. Share one with a church or group so everyone reads with the same setup.",
          })}
        </p>
        {isEmpty ? (
          customizations.isLoading.value ? (
            <div className="sb-settings-empty-state">
              <p>{t("loading", { defaultValue: "Loading…" })}</p>
            </div>
          ) : null
        ) : (
          <ul className="sb-cz-card-list">
            {list.map((customization) => {
              const previewVariant =
                customization.variants.find(
                  (v) => v.id === customization.defaultVariantId
                ) ?? customization.variants[0];
              return (
                <li key={customization.id} className="sb-cz-card">
                  <button
                    type="button"
                    className="sb-cz-card-open"
                    onClick={() => openCustomization(customization.id)}
                  >
                    {previewVariant && (
                      <CustomizationCardPreview
                        theme={customizations.resolveEditingVariantTheme(
                          previewVariant
                        )}
                        logoUrl={customization.logoUrl}
                        heading={t("customization-preview-chapter", {
                          defaultValue: "John 1",
                        })}
                      />
                    )}
                    <span className="sb-cz-card-text">
                      <span className="sb-cz-card-title" dir="auto">
                        {customization.name}
                      </span>
                      <span className="sb-cz-card-subtitle">
                        {t("customization-card-summary", {
                          themes: t("customization-theme-count", {
                            count: customization.variants.length,
                            defaultValue: "{{count}} themes",
                          }),
                          translation: getDefaultTranslationLabel(
                            t,
                            customization,
                            state.bibleData.availableTranslations.value
                          ),
                          defaultValue: "{{themes}} · {{translation}}",
                        })}
                      </span>
                    </span>
                  </button>
                  <ContextMenuWithButton
                    anchorClassName="sb-cz-card-menu"
                    buttonClassName="sb-cz-icon-button"
                    aria-label={t("customization-options", {
                      defaultValue: "Customization options",
                    })}
                  >
                    <ContextMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(
                          customizations.getShareLink(customization)
                        );
                        state.app.toast(
                          t("customization-link-copied", {
                            defaultValue:
                              "Customization link copied to clipboard",
                          })
                        );
                      }}
                    >
                      <MaterialIcon className="sb-context-menu-item-icon">
                        share
                      </MaterialIcon>
                      <span>{t("share", { defaultValue: "Share" })}</span>
                    </ContextMenuItem>
                  </ContextMenuWithButton>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="sb-cz-new-button"
          onClick={() => void handleCreate()}
        >
          <span className="material-symbols-outlined">add</span>
          {t("new-customization", { defaultValue: "New customization" })}
        </button>
      </section>
    </div>
  );
}

function SettingsMainView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { branding } = useAppConfig();
  const { t, language, availableLanguages, setLanguage } = useI18n();
  const isLoggedIn = useComputed(() => state.login.userId.value !== null);

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
              className="sb-settings-nav-item hide-on-mobile"
              onClick={() => onNavigate("toolbar")}
            >
              <span className="sb-settings-nav-icon">
                <MaterialIcon>tune</MaterialIcon>
              </span>
              <span className="sb-settings-nav-label">
                {t("toolbar", { defaultValue: "Toolbar" })}
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
          {isLoggedIn.value && (
            <li>
              <button
                className="sb-settings-nav-item"
                onClick={() => onNavigate("customizations")}
              >
                <span className="sb-settings-nav-icon">
                  <MaterialIcon>palette</MaterialIcon>
                </span>
                <span className="sb-settings-nav-label">
                  {t("customize", { defaultValue: "Customize" })}
                </span>
                <span className="material-symbols-outlined rtl-mirror">
                  chevron_right
                </span>
              </button>
            </li>
          )}
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
  // Honor a deep-link requested by the sidebar (e.g. `?settingsView=toolbar`).
  const currentView = state.sidebar.requestedSettingsView;

  if (currentView.value === "display-and-theme") {
    return <DisplayAndThemeSettingsView state={state} />;
  }

  if (currentView.value === "toolbar") {
    return <ToolbarSettingsView state={state} />;
  }

  if (currentView.value === "extensions") {
    return <ExtensionsSettingsView state={state} />;
  }

  if (currentView.value === "customizations") {
    return <CustomizationsSettingsView state={state} />;
  }

  return <SettingsMainView state={state} />;
}
