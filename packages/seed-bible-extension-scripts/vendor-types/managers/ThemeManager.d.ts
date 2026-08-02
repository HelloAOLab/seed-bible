import { type ReadonlySignal, type Signal } from "@preact/signals";
import type { SettingsManager } from "./SettingsManager";
export interface BibleThemeVariables {
  primaryColor: string;
  primaryFontColor: string;
  secondaryColor: string;
  secondaryFontColor: string;
  tertiaryColor: string;
  linkColor: string;
  linkVisitedColor: string;
  /**
   * The background color for the entire app. This is used as the background for the body element, so it will be visible in areas that don't have a specific background set (e.g. when a pane is detached or when there are gaps between panes). It should generally match the readerBackground color to create a seamless look, but can be set to a different color if desired.
   */
  background: string;
  /**
   * The default font family for the app. This will be used for general UI elements and can be overridden by more specific font settings (e.g. verseFontFamily, chapterHeadingFontFamily). It should generally be a clean, readable sans-serif font for optimal readability, but can be customized as needed.
   */
  fontFamily: string;
  /**
   * The default font color for the app. This will be used for general text and UI elements and can be overridden by more specific color settings (e.g. verseTextColor, chapterHeadingColor). It should generally be a dark color for optimal readability against the background, but can be customized as needed.
   */
  fontColor: string;
  /**
   * The background of the sidebar.
   */
  sidebarBackground?: string | null;
  /**
   * The font family for the sidebar. This can be customized independently of the main fontFamily.
   */
  sidebarFontFamily?: string | null;
  /**
   * The font color for the sidebar. This can be customized independently of the main fontColor, but should generally have good contrast against the sidebarBackground color for readability.
   */
  sidebarFontColor?: string | null;
  /**
   * The background color for the book selector dropdown. This should generally match the readerBackground color to create a seamless look, but can be set to a different color if desired.
   */
  bookSelectorBackground?: string | null;
  /**
   * The font family for the book selector. This can be customized independently of the main fontFamily, but should generally be a clean, readable sans-serif font for optimal readability.
   */
  bookSelectorFontFamily?: string | null;
  /**
   * The font color for the book selector. This can be customized independently of the main fontColor, but should generally have good contrast against the bookSelectorBackground color for readability.
   */
  bookSelectorFontColor?: string | null;
  /**
   * The background of the reader area where the Bible text is displayed. This should generally be a light color for readability, but can be customized as needed.
   */
  readerBackground: string;
  /**
   * The font family for the reader area. This should generally be a serif font for optimal readability of the Bible text, but can be customized as needed.
   */
  readerFontFamily?: string | null;
  /**
   * The font color for the reader area. This should generally be a dark color for optimal readability against the readerBackground color, but can be customized as needed.
   */
  readerFontColor?: string | null;
  /**
   * The font family for book titles. This should generally be a bold, distinctive font to help book titles stand out, but can be customized as needed.
   */
  bookTitleFontFamily?: string;
  /**
   * The font color for book titles. This should generally have good contrast against the readerBackground color to help book titles stand out, but can be customized as needed.
   */
  bookTitleFontColor?: string | null;
  /**
   * The font family for chapter headings. This should generally be a bold, distinctive font to help chapter headings stand out, but can be customized as needed.
   */
  chapterHeadingFontFamily?: string | null;
  /**
   * The font color for chapter headings. This should generally have good contrast against the readerBackground color to help chapter headings stand out, but can be customized as needed.
   */
  chapterHeadingFontColor?: string | null;
  /**
   * The font style for chapter headings (e.g. "italic", "normal", "oblique"). This can be used to further differentiate chapter headings from the main text and book titles, but can be customized as needed.
   */
  chapterHeadingFontStyle?: string | null;
  /**
   * The font family for verse text. This should generally be a serif font for optimal readability of the Bible text, but can be customized as needed.
   */
  verseFontFamily?: string | null;
  /**
   * The font color for verse text. This should generally be a dark color for optimal readability against the readerBackground color, but can be customized as needed.
   */
  verseFontColor?: string | null;
  /**
   * The cursor that should be displayed for verses.
   */
  verseCursor?: string | null;
  /**
   * The text decoration for selected verses (e.g. "underline", "line-through", "none"). This can be used to further differentiate selected verses from unselected verses, but can be customized as needed. If not set, it will default to "none".
   */
  selectedVerseTextDecoration?: string | null;
  /**
   * The border-bottom property for selected verses.
   */
  selectedVerseBorderBottom?: string | null;
  /**
   * The decoration color for selected verses.
   */
  selectedVerseTextDecorationColor?: string | null;
  /**
   * The font family for Hebrew text. This should generally be a font that supports Hebrew characters and is optimized for readability, but can be customized as needed.
   */
  hebrewSubtitleFontFamily?: string | null;
  /**
   * The font color for Hebrew text. This should generally have good contrast against the readerBackground color for readability, but can be customized as needed.
   */
  hebrewSubtitleFontColor?: string | null;
  /**
   * The font style for Hebrew subtitle text.
   */
  hebrewSubtitleFontStyle?: string | null;
  /**
   * The bottom offset for the reader toolbar.
   */
  readerToolbarBottom?: string | null;
  /**
   * The gap between items in the reader toolbar.
   */
  readerToolbarGap?: string | null;
  /**
   * The padding for the reader toolbar.
   */
  readerToolbarPadding?: string | null;
  /**
   * The border radius for the reader toolbar.
   */
  readerToolbarBorderRadius?: string | null;
  /**
   * The background color of the reader toolbar.
   */
  readerToolbarBackground?: string | null;
  /**
   * The border for the reader toolbar.
   */
  readerToolbarBorder?: string | null;
  /**
   * The box shadow for the reader toolbar.
   */
  readerToolbarBoxShadow?: string | null;
  /**
   * The z-index for the reader toolbar.
   */
  readerToolbarZIndex?: string | null;
  /**
   * The height of the reader toolbar.
   */
  readerToolbarHeight?: string | null;
  /**
   * The top offset of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonTop?: string | null;
  /**
   * The width of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonWidth?: string | null;
  /**
   * The height of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonHeight?: string | null;
  /**
   * The border of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonBorder?: string | null;
  /**
   * The border radius of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonBorderRadius?: string | null;
  /**
   * The background of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonBackground?: string | null;
  /**
   * The font color of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonFontColor?: string | null;
  /**
   * The box shadow of the reader toolbar floating button.
   */
  readerToolbarFloatingButtonBoxShadow?: string | null;
  /**
   * The gap between items in the verse toolbar.
   */
  verseToolbarGap?: string | null;
  /**
   * The padding of the verse toolbar.
   */
  verseToolbarPadding?: string | null;
  /**
   * The border radius of the verse toolbar.
   */
  verseToolbarBorderRadius?: string | null;
  /**
   * The border of the verse toolbar.
   */
  verseToolbarBorder?: string | null;
  /**
   * The box shadow of the verse toolbar.
   */
  verseToolbarBoxShadow?: string | null;
  /**
   * The z-index of the verse toolbar.
   */
  verseToolbarZIndex?: string | null;
  /**
   * The minimum height of the verse toolbar.
   */
  verseToolbarMinHeight?: string | null;
  /**
   * The mobile layout height of the reader toolbar.
   */
  readerToolbarMobileLayoutHeight?: string | null;
  /**
   * The mobile layout padding of the reader toolbar.
   */
  readerToolbarMobileLayoutPadding?: string | null;
  /**
   * The mobile layout gap of the reader toolbar.
   */
  readerToolbarMobileLayoutGap?: string | null;
  /**
   * The mobile layout item size of the reader toolbar.
   */
  readerToolbarMobileLayoutItemSize?: string | null;
  /**
   * The mobile layout center button width of the reader toolbar.
   */
  readerToolbarMobileLayoutCenterButtonWidth?: string | null;
  /**
   * The mobile layout center button height of the reader toolbar.
   */
  readerToolbarMobileLayoutCenterButtonHeight?: string | null;
  /**
   * The mobile layout button border radius of the reader toolbar.
   */
  readerToolbarMobileLayoutButtonBorderRadius?: string | null;
  /**
   * The side offset of reader toolbar floating buttons.
   */
  readerToolbarFloatingButtonSideOffset?: string | null;
  /**
   * The gap between tools in the verse toolbar tools container.
   */
  verseToolbarToolsGap?: string | null;
  /**
   * The bottom offset of the mobile verse toolbar.
   */
  verseToolbarMobileBottom?: string | null;
  /**
   * Whether to invert raster `<img>` toolbar icons supplied by extensions.
   * `0` keeps them as-is (correct for light themes where extension icons
   * are typically dark glyphs on transparent backgrounds); `1` flips
   * black↔white via `filter: invert(...)` so silhouette icons remain
   * visible on dark surfaces. Set as a unitless number, used directly
   * inside `invert(var(--sb-toolbar-icon-invert))`.
   */
  toolbarIconInvert?: string | null;
  /**
   * Background for popover surfaces — context menus, tab menus, sidebar
   * search results, dropdown panels. Should generally be opaque and have
   * good contrast against the menu's text color in both themes.
   */
  menuBackground?: string | null;
  /**
   * Font color for popover surfaces — context menus, tab menus, sidebar
   * search results, dropdown panels. Should generally have good contrast
   * against `menuBackground`.
   */
  menuFontColor?: string | null;
  /**
   * Font color for the reader toolbar (also drives icon color since icons
   * inherit `currentColor`). Should have good contrast against
   * `readerToolbarBackground`.
   */
  readerToolbarFontColor?: string | null;
  /**
   * Font family for the reader toolbar text. Defaults to the app font family
   * when unset.
   */
  readerToolbarFontFamily?: string | null;
  /**
   * Subtle separator color used for dividers, hairline borders, and resize
   * handles. Should have low contrast against the surrounding background but
   * remain visible in both light and dark themes.
   */
  dividerColor?: string | null;
  /**
   * Tint used for drop shadows and elevation effects. Typically a very dark
   * semi-transparent color in light themes and a darker / more opaque value
   * in dark themes so shadows still register on near-black surfaces.
   */
  shadowColor?: string | null;
  /**
   * The border for tabs. This is used for the border of unselected tabs. It should generally be a subtle color that complements the primary and secondary colors, but can be customized as needed. If not set, it will default to "none".
   */
  tabBorder: string | null;
  /**
   * The background for tabs. This is used for the background of unselected tabs. It should generally be a subtle color that complements the primary and secondary colors, but can be customized as needed. If not set, it will default to "inherit" to use the background of the parent element.
   */
  tabBackground: string | null;
  /**
   * The font color for tabs. This is used for the font color of unselected tabs. It should generally have good contrast against the tabBackground color for readability, but can be customized as needed. If not set, it will default to "inherit" to use the font color of the parent element.
   */
  tabFontColor: string | null;
  /**
   * The border for the selected tab.
   */
  selectedTabBorder: string | null;
  /**
   * The background for selected tabs.
   */
  selectedTabBackground: string | null;
  /**
   * The font color for selected tabs.
   */
  selectedTabFontColor: string | null;
}
export interface ThemeHighlightColor {
  /**
   * The color of the background for verses which are highlighted with this color.
   */
  color: string;
  /**
   * The color of the font for verses which are highlighted with this color.
   */
  fontColor: string;
  /**
   * The color that should be used to display "words of jesus" text highlighted with this color.
   */
  wordsOfJesusFontColor: string;
}
/**
 * The highlight colors for the given theme.
 */
export interface BibleThemeHighlightColors {
  yellow: ThemeHighlightColor;
  green: ThemeHighlightColor;
  blue: ThemeHighlightColor;
  pink: ThemeHighlightColor;
  purple: ThemeHighlightColor;
  orange: ThemeHighlightColor;
  [colorId: string]: ThemeHighlightColor;
}
export interface BibleTheme {
  id: string;
  name: string;
  variables: BibleThemeVariables;
  highlightColors: BibleThemeHighlightColors;
}
export declare function generateThemeCssVariables(
  variables: BibleTheme
): string;
export declare function generateThemeCssClasses(theme: BibleTheme): string;
/**
 * Keys of `BibleThemeVariables` that represent a plain color value and are
 * safe to expose in a generic color-picker UI. Typography, spacing, borders,
 * and composite CSS values are intentionally excluded.
 */
export type ThemeColorKey =
  | "primaryColor"
  | "primaryFontColor"
  | "secondaryColor"
  | "secondaryFontColor"
  | "tertiaryColor"
  | "linkColor"
  | "linkVisitedColor"
  | "background"
  | "fontColor"
  | "sidebarBackground"
  | "sidebarFontColor"
  | "bookSelectorBackground"
  | "bookSelectorFontColor"
  | "readerBackground"
  | "readerFontColor"
  | "bookTitleFontColor"
  | "chapterHeadingFontColor"
  | "verseFontColor"
  | "selectedVerseTextDecorationColor"
  | "hebrewSubtitleFontColor"
  | "readerToolbarBackground"
  | "readerToolbarFloatingButtonBackground"
  | "readerToolbarFloatingButtonFontColor"
  | "tabFontColor"
  | "selectedTabFontColor";
export interface ThemeColorField {
  key: ThemeColorKey;
  label: string;
}
export interface ThemeColorGroup {
  id: string;
  title: string;
  fields: ThemeColorField[];
}
export declare const THEME_COLOR_GROUPS: ThemeColorGroup[];
export declare const DEFAULT_HIGHLIGHT_IDS: readonly [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
  "orange",
];
export type HighlightId = (typeof DEFAULT_HIGHLIGHT_IDS)[number];
type ThemeOverrides = Partial<Record<ThemeColorKey, string>>;
type HighlightOverrides = Record<string, Partial<ThemeHighlightColor>>;
export interface ThemeManager {
  themes: Signal<BibleTheme[]>;
  selectedThemeId: ReadonlySignal<string>;
  /** Effective theme = preset with custom overrides applied. */
  currentTheme: ReadonlySignal<BibleTheme>;
  /** The base preset for `selectedThemeId`, without custom overrides. */
  basePresetTheme: ReadonlySignal<BibleTheme>;
  /** User color overrides layered on top of the selected preset. */
  customOverrides: ReadonlySignal<ThemeOverrides>;
  /** User highlight color overrides layered on top of the preset highlights. */
  customHighlightOverrides: ReadonlySignal<HighlightOverrides>;
  setTheme: (themeId: string) => void;
  setCustomColor: (key: ThemeColorKey, value: string) => void;
  resetCustomColor: (key: ThemeColorKey) => void;
  resetAllCustomColors: () => void;
  setHighlightColor: (
    colorId: string,
    patch: Partial<ThemeHighlightColor>
  ) => void;
  resetHighlightColor: (colorId: string) => void;
  resetAllHighlightColors: () => void;
}
export declare function createTheme(settings: SettingsManager): ThemeManager;
export {};
