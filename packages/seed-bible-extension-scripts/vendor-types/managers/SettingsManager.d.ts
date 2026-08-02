import { type Signal } from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import * as z from "zod/v4";
import type { CasualOSManager } from "./OsManager";
import type { NavigationManager } from "./NavigationManager";
import type { ThemeHighlightColor } from "./ThemeManager";
export type BookOrientation = "traditional" | "tanakh";
export type UISize = "S" | "M" | "L" | "XL";
export type TextAlignment = "unset" | "left" | "center" | "right";
export type TextSectionId = "bookTitle" | "heading" | "verse";
export type TextSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type SettingsPresetId = "minimal" | "full";
export interface SelectionUIBehavior {
  showSelectedItems: boolean;
  showHighlightColors: boolean;
  showIconText: boolean;
}
export interface ScriptureElementsBehavior {
  showHeadings: boolean;
  showVerseNumbers: boolean;
  showFootnotes: boolean;
  showHighlights: boolean;
  showRedLettering: boolean;
}
export interface TextSectionConfig {
  font: string;
  weight: string;
  color: string;
  marginVertical: number;
  marginHorizontal: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: TextAlignment;
  /** Line height for the verse section. Other sections ignore this. */
  lineHeight?: number;
}
export declare const VERSE_LINE_HEIGHT_OPTIONS: number[];
export declare const DEFAULT_VERSE_LINE_HEIGHT = 1.7;
export type TextConfig = Record<TextSectionId, TextSectionConfig>;
export interface ToolbarCustomization {
  /** Tool IDs that should be hidden from the toolbar. */
  hidden: string[];
  /** Tool IDs in preferred display order. IDs not listed keep their default priority after the ordered ones. */
  order: string[];
}
export interface AppSettings {
  fontSize: TextSize;
  disablePanels: boolean;
  bookOrientation: BookOrientation;
  uiSize: UISize;
  selectionUI: SelectionUIBehavior;
  scriptureElements: ScriptureElementsBehavior;
  textConfig: TextConfig;
  toolbar: ToolbarCustomization;
  keepScreenAwake: boolean;
  /** User-added custom highlight colors (hex strings, max 3). */
  customHighlightColors: string[];
  /** Horizontal padding (px) applied to the bible reader container. */
  scriptureMargin: number;
  /** Selected theme preset id (owned/consumed by ThemeManager). */
  themeId: string;
  /** User color overrides layered on top of the selected theme preset. */
  customTheme: Record<string, string>;
  /** User highlight-color overrides layered on top of the preset highlights. */
  customHighlights: Record<string, Partial<ThemeHighlightColor>>;
}
export declare const AppSettingsSchema: z.ZodObject<
  {
    fontSize: z.ZodEnum<{
      S: "S";
      M: "M";
      L: "L";
      XL: "XL";
      XS: "XS";
      XXL: "XXL";
    }>;
    disablePanels: z.ZodBoolean;
    bookOrientation: z.ZodEnum<{
      traditional: "traditional";
      tanakh: "tanakh";
    }>;
    uiSize: z.ZodEnum<{
      S: "S";
      M: "M";
      L: "L";
      XL: "XL";
    }>;
    selectionUI: z.ZodObject<
      {
        showSelectedItems: z.ZodBoolean;
        showHighlightColors: z.ZodBoolean;
        showIconText: z.ZodBoolean;
      },
      z.core.$strip
    >;
    scriptureElements: z.ZodObject<
      {
        showHeadings: z.ZodBoolean;
        showVerseNumbers: z.ZodBoolean;
        showFootnotes: z.ZodBoolean;
        showHighlights: z.ZodBoolean;
        showRedLettering: z.ZodBoolean;
      },
      z.core.$strip
    >;
    textConfig: z.ZodObject<
      {
        bookTitle: z.ZodObject<
          {
            font: z.ZodString;
            weight: z.ZodString;
            color: z.ZodString;
            marginVertical: z.ZodNumber;
            marginHorizontal: z.ZodNumber;
            bold: z.ZodBoolean;
            italic: z.ZodBoolean;
            underline: z.ZodBoolean;
            alignment: z.ZodEnum<{
              left: "left";
              right: "right";
              center: "center";
              unset: "unset";
            }>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
          },
          z.core.$strip
        >;
        heading: z.ZodObject<
          {
            font: z.ZodString;
            weight: z.ZodString;
            color: z.ZodString;
            marginVertical: z.ZodNumber;
            marginHorizontal: z.ZodNumber;
            bold: z.ZodBoolean;
            italic: z.ZodBoolean;
            underline: z.ZodBoolean;
            alignment: z.ZodEnum<{
              left: "left";
              right: "right";
              center: "center";
              unset: "unset";
            }>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
          },
          z.core.$strip
        >;
        verse: z.ZodObject<
          {
            font: z.ZodString;
            weight: z.ZodString;
            color: z.ZodString;
            marginVertical: z.ZodNumber;
            marginHorizontal: z.ZodNumber;
            bold: z.ZodBoolean;
            italic: z.ZodBoolean;
            underline: z.ZodBoolean;
            alignment: z.ZodEnum<{
              left: "left";
              right: "right";
              center: "center";
              unset: "unset";
            }>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
          },
          z.core.$strip
        >;
      },
      z.core.$strip
    >;
    toolbar: z.ZodObject<
      {
        hidden: z.ZodArray<z.ZodString>;
        order: z.ZodArray<z.ZodString>;
      },
      z.core.$strip
    >;
    keepScreenAwake: z.ZodBoolean;
    customHighlightColors: z.ZodArray<z.ZodString>;
    scriptureMargin: z.ZodNumber;
    themeId: z.ZodString;
    customTheme: z.ZodRecord<z.ZodString, z.ZodString>;
    customHighlights: z.ZodRecord<
      z.ZodString,
      z.ZodObject<
        {
          color: z.ZodOptional<z.ZodString>;
          fontColor: z.ZodOptional<z.ZodString>;
          wordsOfJesusFontColor: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const DEFAULT_SCRIPTURE_MARGIN = 27;
export declare const MOBILE_SCRIPTURE_MARGIN = 5;
export declare const MAX_CUSTOM_HIGHLIGHT_COLORS = 3;
export declare const TEXT_FONT_OPTIONS: {
  value: string;
  label: string;
}[];
export declare const TEXT_WEIGHT_OPTIONS: {
  value: string;
  label: string;
}[];
/**
 * Maps each text section to the theme color variable it should override.
 * Exported so the settings UI can render the resolved theme color in the
 * "follow theme" swatch.
 */
export declare const TEXT_SECTION_THEME_COLOR_VAR: Record<
  TextSectionId,
  string
>;
/**
 * Apply the user's toolbar customization (hidden + explicit order) to a list
 * of tools identified by `id`. Hidden tools are removed; tools listed in
 * `order` come first in that order; remaining tools keep their natural order.
 */
export declare function applyToolbarCustomization<
  T extends {
    id: string;
  },
>(tools: T[], config: ToolbarCustomization): T[];
export declare const UI_SIZE_OPTIONS: UISize[];
export declare const UI_SIZE_SCALE_MAP: Record<UISize, number>;
export interface SettingsManager {
  settings: Signal<AppSettings>;
  setFontSize: (fontSize: TextSize) => void;
  setDisablePanels: (disablePanels: boolean) => void;
  /**
   * Persists the user's chosen UI language to their profile. Wired into
   * `I18nManager`'s `requestLanguageChange` (the selector path) via
   * `setLanguagePersister`, so it runs ONLY for explicit selector choices —
   * never for URL-driven changes (a shared `?lang=` link or browser
   * back/forward), which stay view-only, and never for the profile-to-i18n
   * sync effect (which would just write the value straight back).
   */
  persistLanguage: (language: string) => void;
  setBookOrientation: (orientation: BookOrientation) => void;
  setUISize: (size: UISize) => void;
  setSelectionUI: (patch: Partial<SelectionUIBehavior>) => void;
  setScriptureElements: (patch: Partial<ScriptureElementsBehavior>) => void;
  updateTextSection: (
    section: TextSectionId,
    patch: Partial<TextSectionConfig>
  ) => void;
  /** Set the same horizontal margin on bookTitle, heading, and verse (Scripture Margins control). */
  setScriptureMargin: (margin: number) => void;
  /** Set the verse line-height (Scripture line-spacing control). */
  setVerseLineHeight: (lineHeight: number) => void;
  /** Clear per-section color overrides so the active theme drives text colors. */
  resetTextColors: () => void;
  resetTextConfig: () => void;
  setToolbarHidden: (toolId: string, hidden: boolean) => void;
  setToolbarOrder: (order: string[]) => void;
  resetToolbarConfig: () => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  addCustomHighlightColor: (color: string) => void;
  removeCustomHighlightColor: (color: string) => void;
  setAllSettings: (next: AppSettings) => void;
  resetToDefaults: () => void;
  /** Persists the selected theme preset id. Consumed by ThemeManager. */
  setThemeId: (themeId: string) => void;
  /** Persists theme color overrides. Consumed by ThemeManager. */
  setCustomTheme: (next: Record<string, string>) => void;
  /** Persists theme highlight-color overrides. Consumed by ThemeManager. */
  setCustomHighlights: (
    next: Record<string, Partial<ThemeHighlightColor>>
  ) => void;
}
export declare function createSettings(
  os: CasualOSManager,
  login: LoginManager,
  navigation: NavigationManager
): SettingsManager;
