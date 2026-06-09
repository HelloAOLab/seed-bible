import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../managers/ProfileConfigSync";

export interface BibleThemeVariables {
  primaryColor: string;
  primaryFontColor: string;

  secondaryColor: string;
  secondaryFontColor: string;

  tertiaryColor: string;

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
   * The mobile layout center button size of the reader toolbar.
   */
  readerToolbarMobileLayoutCenterButtonSize?: string | null;

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

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

export function generateThemeCssVariables(variables: BibleTheme): string {
  const cssVariables = Object.entries(variables.variables)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `--sb-${toKebabCase(key)}: ${value};`)
    .join("\n");

  const highlightColorVariables = Object.entries(variables.highlightColors)
    .flatMap(([key, value]) => [
      `--sb-highlight-${key}-color: ${value.color};`,
      `--sb-highlight-${key}-font-color: ${value.fontColor};`,
      `--sb-highlight-${key}-words-of-jesus-font-color: ${value.wordsOfJesusFontColor};`,
    ])
    .join("\n");

  return cssVariables + "\n" + highlightColorVariables;
}

export function generateThemeCssClasses(theme: BibleTheme): string {
  return Object.entries(theme.highlightColors)
    .map(([colorId]) => {
      return [
        `.sb-highlight-${colorId} {`,
        `background-color: var(--sb-highlight-${colorId}-color);`,
        `color: var(--sb-highlight-${colorId}-font-color);`,
        `&.sb-words-of-jesus { `,
        `color: var(--sb-highlight-${colorId}-words-of-jesus-font-color);`,
        `}`,
        ` }`,
      ].join("\n");
    })
    .join("\n");
}

const DEFAULT_THEME_ID = "light";

const LIGHT_THEME: BibleTheme = {
  id: "light",
  name: "Light",
  variables: {
    primaryColor: "#e07b4c",
    primaryFontColor: "#fff",

    secondaryColor: "#faddd1",
    secondaryFontColor: "#333",

    tertiaryColor: "#f0f0f0",

    background: "#f8fafc",

    sidebarBackground: "transparent",
    sidebarFontFamily: "inherit",
    sidebarFontColor: "inherit",

    readerBackground: "#ffffff",
    readerFontFamily: "inherit",
    readerFontColor: "#333",

    bookSelectorBackground: "#ffffff",
    bookSelectorFontFamily: "inherit",
    bookSelectorFontColor: "#333",

    fontFamily: "Satoshi, system-ui, sans-serif",
    fontColor: "#333",

    bookTitleFontFamily: "Newsreader, serif",
    bookTitleFontColor: "#333",

    chapterHeadingFontFamily: "Plus Jakarta Sans, sans-serif",
    chapterHeadingFontColor: "#333",
    chapterHeadingFontStyle: "italic",

    verseFontFamily: "Newsreader, serif",
    verseFontColor: "#333",
    verseCursor: "pointer",

    selectedVerseBorderBottom: "2px dashed currentColor",
    selectedVerseTextDecoration: "none",
    selectedVerseTextDecorationColor: "currentColor",

    hebrewSubtitleFontFamily: "Newsreader, serif",
    hebrewSubtitleFontColor: "#333",
    hebrewSubtitleFontStyle: "italic",

    readerToolbarBottom: "18px",
    readerToolbarGap: "10px",
    readerToolbarPadding: "8px 20px",
    readerToolbarBorderRadius: "22px",
    readerToolbarBackground: "#ffffff",
    readerToolbarBorder: "1px solid #00000024",
    readerToolbarBoxShadow: "0 26px 10px #0000001a",
    readerToolbarZIndex: "99",
    readerToolbarHeight: "50px",

    readerToolbarFloatingButtonTop: "-68px",
    readerToolbarFloatingButtonWidth: "48px",
    readerToolbarFloatingButtonHeight: "48px",
    readerToolbarFloatingButtonBorder: "1px solid #00000024",
    readerToolbarFloatingButtonBorderRadius: "999px",
    readerToolbarFloatingButtonBackground: "#ffffff",
    readerToolbarFloatingButtonFontColor: "#333",
    readerToolbarFloatingButtonBoxShadow: "0 10px 24px #0000001a",

    verseToolbarGap: "10px",
    verseToolbarPadding: "8px 16px",
    verseToolbarBorderRadius: "10px",
    verseToolbarBorder: "1px solid #00000024",
    verseToolbarBoxShadow: "0 26px 10px #0000001a",
    verseToolbarZIndex: "100",
    verseToolbarMinHeight: "50px",

    readerToolbarMobileLayoutHeight: "70px",
    readerToolbarMobileLayoutPadding: "10px 14px",
    readerToolbarMobileLayoutGap: "8px",
    readerToolbarMobileLayoutItemSize: "44px",
    readerToolbarMobileLayoutCenterButtonSize: "52px",
    readerToolbarMobileLayoutButtonBorderRadius: "999px",

    readerToolbarFloatingButtonSideOffset: "16px",

    verseToolbarToolsGap: "10px",
    verseToolbarMobileBottom: "18px",

    menuBackground: "#ffffff",
    menuFontColor: "#333",

    toolbarIconInvert: "0",

    readerToolbarFontColor: "#333",
    readerToolbarFontFamily: "Satoshi, system-ui, sans-serif",

    dividerColor: "rgba(0, 0, 0, 0.12)",
    shadowColor: "rgba(0, 0, 0, 0.14)",

    tabBorder: "1px solid transparent",
    tabBackground: "inherit",
    tabFontColor: "inherit",

    selectedTabBorder: "1px solid var(--sb-primary-color)",
    selectedTabBackground: "var(--sb-secondary-color)",
    selectedTabFontColor: "var(--sb-primary-color)",
  },
  highlightColors: {
    yellow: {
      color: "#fff59d",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    green: {
      color: "#a5d6a7",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    blue: {
      color: "#90caf9",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    pink: {
      color: "#f48fb1",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    purple: {
      color: "#ce93d8",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    orange: {
      color: "#ffcc80",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
  },
};

const DARK_THEME: BibleTheme = {
  id: "dark",
  name: "Dark",
  variables: {
    primaryColor: "#f0a67c",
    primaryFontColor: "#333",

    secondaryColor: "#5c463b",
    secondaryFontColor: "#fff",

    tertiaryColor: "#252a36",

    background: "#121621",

    sidebarBackground: "#161b27",
    sidebarFontFamily: "inherit",
    sidebarFontColor: "#d7deef",

    readerBackground: "#1a2230",
    readerFontFamily: "inherit",
    readerFontColor: "#d7deef",

    bookSelectorBackground: "#1d2534",
    bookSelectorFontFamily: "inherit",
    bookSelectorFontColor: "#d7deef",

    fontFamily: "Satoshi, system-ui, sans-serif",
    fontColor: "#d7deef",

    bookTitleFontFamily: "Newsreader, serif",
    bookTitleFontColor: "#e7edf9",

    chapterHeadingFontFamily: "Plus Jakarta Sans, sans-serif",
    chapterHeadingFontColor: "#d7deef",
    chapterHeadingFontStyle: "italic",

    verseFontFamily: "Newsreader, serif",
    verseFontColor: "#d7deef",
    verseCursor: "pointer",

    selectedVerseBorderBottom: "2px dashed currentColor",
    selectedVerseTextDecoration: "none",
    selectedVerseTextDecorationColor: "currentColor",

    hebrewSubtitleFontFamily: "Newsreader, serif",
    hebrewSubtitleFontColor: "#d7deef",
    hebrewSubtitleFontStyle: "italic",

    readerToolbarBottom: "18px",
    readerToolbarGap: "10px",
    readerToolbarPadding: "8px 20px",
    readerToolbarBorderRadius: "22px",
    readerToolbarBackground: "#1a2230",
    readerToolbarBorder: "1px solid rgba(255, 255, 255, 0.08)",
    readerToolbarBoxShadow: "0 26px 10px rgba(0, 0, 0, 0.4)",
    readerToolbarZIndex: "99",
    readerToolbarHeight: "50px",
    readerToolbarFloatingButtonTop: "-68px",
    readerToolbarFloatingButtonWidth: "48px",
    readerToolbarFloatingButtonHeight: "48px",
    readerToolbarFloatingButtonBorder: "1px solid rgba(255, 255, 255, 0.08)",
    readerToolbarFloatingButtonBorderRadius: "999px",
    readerToolbarFloatingButtonBackground: "#1a2230",
    readerToolbarFloatingButtonFontColor: "#d7deef",
    readerToolbarFloatingButtonBoxShadow: "0 10px 24px rgba(0, 0, 0, 0.4)",

    verseToolbarGap: "10px",
    verseToolbarPadding: "8px 16px",
    verseToolbarBorderRadius: "10px",
    verseToolbarBorder: "1px solid rgba(255, 255, 255, 0.08)",
    verseToolbarBoxShadow: "0 26px 10px rgba(0, 0, 0, 0.4)",
    verseToolbarZIndex: "100",
    verseToolbarMinHeight: "50px",

    readerToolbarMobileLayoutHeight: "70px",
    readerToolbarMobileLayoutPadding: "10px 14px",
    readerToolbarMobileLayoutGap: "8px",
    readerToolbarMobileLayoutItemSize: "44px",
    readerToolbarMobileLayoutCenterButtonSize: "52px",
    readerToolbarMobileLayoutButtonBorderRadius: "999px",

    readerToolbarFloatingButtonSideOffset: "16px",

    verseToolbarToolsGap: "10px",
    verseToolbarMobileBottom: "18px",

    menuBackground: "#1d2534",
    menuFontColor: "#d7deef",

    toolbarIconInvert: "1",

    readerToolbarFontColor: "#d7deef",
    readerToolbarFontFamily: "Satoshi, system-ui, sans-serif",

    dividerColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "rgba(0, 0, 0, 0.45)",

    tabBorder: "1px solid transparent",
    tabBackground: "inherit",
    tabFontColor: "inherit",

    selectedTabBorder: "1px solid var(--sb-primary-color)",
    selectedTabBackground: "var(--sb-secondary-color)",
    selectedTabFontColor: "var(--sb-primary-color)",
  },
  highlightColors: {
    yellow: {
      color: "#fff59d",
      fontColor: "#333",
      wordsOfJesusFontColor: "#f0a67c",
    },
    green: {
      color: "#a5d6a7",
      fontColor: "#333",
      wordsOfJesusFontColor: "#f0a67c",
    },
    blue: {
      color: "#90caf9",
      fontColor: "#333",
      wordsOfJesusFontColor: "#f0a67c",
    },
    pink: {
      color: "#f48fb1",
      fontColor: "#333",
      wordsOfJesusFontColor: "#f0a67c",
    },
    purple: {
      color: "#ce93d8",
      fontColor: "#333",
      wordsOfJesusFontColor: "#f0a67c",
    },
    orange: {
      color: "#ffcc80",
      fontColor: "#333",
      wordsOfJesusFontColor: "#f0a67c",
    },
  },
};

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

export const THEME_COLOR_GROUPS: ThemeColorGroup[] = [
  {
    id: "brand",
    title: "Brand",
    fields: [
      { key: "primaryColor", label: "Primary" },
      { key: "primaryFontColor", label: "Primary text" },
      { key: "secondaryColor", label: "Secondary" },
      { key: "secondaryFontColor", label: "Secondary text" },
      { key: "tertiaryColor", label: "Tertiary" },
    ],
  },
  {
    id: "surfaces",
    title: "Surfaces",
    fields: [
      { key: "background", label: "App background" },
      { key: "readerBackground", label: "Reader background" },
      { key: "sidebarBackground", label: "Sidebar background" },
      { key: "bookSelectorBackground", label: "Book selector background" },
      { key: "readerToolbarBackground", label: "Reader toolbar background" },
      {
        key: "readerToolbarFloatingButtonBackground",
        label: "Floating button background",
      },
    ],
  },
  {
    id: "text",
    title: "Text",
    fields: [
      { key: "fontColor", label: "Default text" },
      { key: "readerFontColor", label: "Reader text" },
      { key: "sidebarFontColor", label: "Sidebar text" },
      { key: "bookSelectorFontColor", label: "Book selector text" },
      { key: "bookTitleFontColor", label: "Book title" },
      { key: "chapterHeadingFontColor", label: "Chapter heading" },
      { key: "verseFontColor", label: "Verse" },
      { key: "hebrewSubtitleFontColor", label: "Hebrew subtitle" },
      {
        key: "readerToolbarFloatingButtonFontColor",
        label: "Floating button text",
      },
    ],
  },
  {
    id: "selection",
    title: "Verse selection",
    fields: [
      {
        key: "selectedVerseTextDecorationColor",
        label: "Selected verse decoration",
      },
    ],
  },
  {
    id: "tabs",
    title: "Tabs",
    fields: [
      { key: "tabFontColor", label: "Tab text" },
      { key: "selectedTabFontColor", label: "Selected tab text" },
    ],
  },
];

const TAG_THEME_ID = "app.themeId";
const TAG_CUSTOM_THEME = "app.customTheme";
const TAG_CUSTOM_HIGHLIGHTS = "app.customHighlights";

// Profile.config keys (matches the unprefixed convention used by
// ConfigManager / SettingsManager).
const PROFILE_THEME_ID = "themeId";
const PROFILE_CUSTOM_THEME = "customTheme";
const PROFILE_CUSTOM_HIGHLIGHTS = "customHighlights";

export const DEFAULT_HIGHLIGHT_IDS = [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
  "orange",
] as const;

export type HighlightId = (typeof DEFAULT_HIGHLIGHT_IDS)[number];

type ThemeOverrides = Partial<Record<ThemeColorKey, string>>;
type HighlightOverrides = Partial<Record<string, Partial<ThemeHighlightColor>>>;

const THEME_COLOR_KEYS: ThemeColorKey[] = THEME_COLOR_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key)
);

function parseThemeId(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function parseHighlightOverrides(value: unknown): HighlightOverrides {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return {};
  }
  const obj = parsed as Record<string, unknown>;
  const overrides: HighlightOverrides = {};
  for (const [id, entry] of Object.entries(obj)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const sub: Partial<ThemeHighlightColor> = {};
    if (typeof e.color === "string") sub.color = e.color;
    if (typeof e.fontColor === "string") sub.fontColor = e.fontColor;
    if (typeof e.wordsOfJesusFontColor === "string") {
      sub.wordsOfJesusFontColor = e.wordsOfJesusFontColor;
    }
    if (Object.keys(sub).length > 0) overrides[id] = sub;
  }
  return overrides;
}

function applyHighlightOverrides(
  theme: BibleTheme,
  overrides: HighlightOverrides
): BibleTheme {
  if (Object.keys(overrides).length === 0) return theme;
  const mergedHighlights: Record<string, ThemeHighlightColor> = {};
  for (const [id, colors] of Object.entries(theme.highlightColors)) {
    mergedHighlights[id] = { ...colors, ...(overrides[id] ?? {}) };
  }
  return {
    ...theme,
    highlightColors: mergedHighlights as BibleThemeHighlightColors,
  };
}

function parseCustomTheme(value: unknown): ThemeOverrides {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return {};
  }
  const obj = parsed as Record<string, unknown>;
  const overrides: ThemeOverrides = {};
  for (const key of THEME_COLOR_KEYS) {
    const raw = obj[key];
    if (typeof raw === "string" && raw.length > 0) {
      overrides[key] = raw;
    }
  }
  return overrides;
}

function applyOverrides(
  theme: BibleTheme,
  overrides: ThemeOverrides
): BibleTheme {
  const anyOverrides = Object.keys(overrides).length > 0;
  if (!anyOverrides) {
    return theme;
  }
  return {
    ...theme,
    variables: { ...theme.variables, ...overrides },
  };
}

export interface ThemeManager {
  themes: Signal<BibleTheme[]>;
  selectedThemeId: Signal<string>;
  /** Effective theme = preset with custom overrides applied. */
  currentTheme: ReadonlySignal<BibleTheme>;
  /** The base preset for `selectedThemeId`, without custom overrides. */
  basePresetTheme: ReadonlySignal<BibleTheme>;
  /** User color overrides layered on top of the selected preset. */
  customOverrides: Signal<ThemeOverrides>;
  /** User highlight color overrides layered on top of the preset highlights. */
  customHighlightOverrides: Signal<HighlightOverrides>;
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

// const SEPIA_THEME: BibleTheme = {
//   id: "sepia",
//   name: "Sepia",
//   variables: {
//     primaryColor: "#b5803d",
//     primaryFontColor: "#fff8ec",
//     secondaryColor: "#e8d9b8",
//     secondaryFontColor: "#5b4636",
//     tertiaryColor: "#ede1c7",
//     background: "#f4ecd8",
//     sidebarBackground: "#f0e6cf",
//     sidebarFontFamily: "inherit",
//     sidebarFontColor: "#5b4636",
//     readerBackground: "#faf3e0",
//     readerFontFamily: "inherit",
//     readerFontColor: "#5b4636",
//     bookSelectorBackground: "#f4ecd8",
//     bookSelectorFontFamily: "inherit",
//     bookSelectorFontColor: "#5b4636",
//     fontFamily: "Satoshi, system-ui, sans-serif",
//     fontColor: "#5b4636",
//     bookTitleFontFamily: "Newsreader, serif",
//     bookTitleFontColor: "#5b4636",
//     chapterHeadingFontFamily: "Plus Jakarta Sans, sans-serif",
//     chapterHeadingFontColor: "#7a5c3d",
//     chapterHeadingFontStyle: "italic",
//     verseFontFamily: "Newsreader, serif",
//     verseFontColor: "#4a3828",
//     verseCursor: "pointer",
//     selectedVerseFontFamily: "inherit",
//     selectedVerseFontColor: "inherit",
//     selectedVerseBackgroundColor: "inherit",
//     selectedVerseTextDecoration: "underline",
//     selectedVerseTextDecorationColor: "currentColor",
//     hebrewSubtitleFontFamily: "Newsreader, serif",
//     hebrewSubtitleFontColor: "#7a5c3d",
//     hebrewSubtitleFontStyle: "italic",
//     readerToolbarBottom: "18px",
//     readerToolbarGap: "10px",
//     readerToolbarPadding: "8px 20px",
//     readerToolbarBorderRadius: "22px",
//     readerToolbarBackground: "#faf3e0",
//     readerToolbarBorder: "1px solid #00000020",
//     readerToolbarBoxShadow: "0 26px 10px #0000001a",
//     readerToolbarZIndex: "99",
//     readerToolbarHeight: "50px",
//     readerToolbarFloatingButtonTop: "-68px",
//     readerToolbarFloatingButtonWidth: "48px",
//     readerToolbarFloatingButtonHeight: "48px",
//     readerToolbarFloatingButtonBorder: "1px solid #00000020",
//     readerToolbarFloatingButtonBorderRadius: "999px",
//     readerToolbarFloatingButtonBackground: "#faf3e0",
//     readerToolbarFloatingButtonFontColor: "#5b4636",
//     readerToolbarFloatingButtonBoxShadow: "0 10px 24px #0000001a",
//     verseToolbarGap: "10px",
//     verseToolbarPadding: "8px 16px",
//     verseToolbarBorderRadius: "10px",
//     verseToolbarBorder: "1px solid #00000020",
//     verseToolbarBoxShadow: "0 26px 10px #0000001a",
//     verseToolbarZIndex: "100",
//     verseToolbarMinHeight: "50px",
//     readerToolbarMobileLayoutHeight: "70px",
//     readerToolbarMobileLayoutPadding: "10px 14px",
//     readerToolbarMobileLayoutGap: "8px",
//     readerToolbarMobileLayoutItemSize: "44px",
//     readerToolbarMobileLayoutCenterButtonSize: "52px",
//     readerToolbarMobileLayoutButtonBorderRadius: "999px",
//     readerToolbarFloatingButtonSideOffset: "16px",
//     verseToolbarToolsGap: "10px",
//     verseToolbarMobileBottom: "18px",
//     tabBorder: "1px solid transparent",
//     tabBackground: "inherit",
//     tabFontColor: "inherit",
//     selectedTabBorder: "1px solid var(--sb-primary-color)",
//     selectedTabBackground: "var(--sb-secondary-color)",
//     selectedTabFontColor: "var(--sb-primary-color)",
//   },
//   highlightColors: {
//     yellow: {
//       color: "#f6e58d",
//       fontColor: "#5b4636",
//       wordsOfJesusFontColor: "#b5803d",
//     },
//     green: {
//       color: "#c5d3a8",
//       fontColor: "#5b4636",
//       wordsOfJesusFontColor: "#b5803d",
//     },
//     blue: {
//       color: "#a8c5d3",
//       fontColor: "#5b4636",
//       wordsOfJesusFontColor: "#b5803d",
//     },
//     pink: {
//       color: "#e3a8b5",
//       fontColor: "#5b4636",
//       wordsOfJesusFontColor: "#b5803d",
//     },
//     purple: {
//       color: "#c2a8d3",
//       fontColor: "#5b4636",
//       wordsOfJesusFontColor: "#b5803d",
//     },
//     orange: {
//       color: "#e3b88a",
//       fontColor: "#5b4636",
//       wordsOfJesusFontColor: "#b5803d",
//     },
//   },
// };

export function createTheme(login: LoginManager): ThemeManager {
  const themes = signal<BibleTheme[]>([LIGHT_THEME, DARK_THEME]);

  const url = new URL(window.location.href);

  const readThemeId = () =>
    parseThemeId(
      getProfileConfigValue(login.profile.value, PROFILE_THEME_ID) ??
        url.searchParams.get(TAG_THEME_ID),
      DEFAULT_THEME_ID
    );

  const readCustomOverrides = () =>
    parseCustomTheme(
      getProfileConfigValue(login.profile.value, PROFILE_CUSTOM_THEME) ??
        url.searchParams.get(TAG_CUSTOM_THEME)
    );

  const readHighlightOverrides = () =>
    parseHighlightOverrides(
      getProfileConfigValue(login.profile.value, PROFILE_CUSTOM_HIGHLIGHTS) ??
        url.searchParams.get(TAG_CUSTOM_HIGHLIGHTS)
    );

  const selectedThemeId = signal<string>(readThemeId());
  const customOverrides = signal<ThemeOverrides>(readCustomOverrides());
  const customHighlightOverrides = signal<HighlightOverrides>(
    readHighlightOverrides()
  );

  // Re-read whenever the user logs in/out so the profile's saved theme
  // overlays the local cache.
  effect(() => {
    void login.profile.value;
    selectedThemeId.value = readThemeId();
    customOverrides.value = readCustomOverrides();
    customHighlightOverrides.value = readHighlightOverrides();
  });

  const basePresetTheme = computed<BibleTheme>(
    () =>
      themes.value.find((theme) => theme.id === selectedThemeId.value) ??
      themes.value[0] ??
      LIGHT_THEME
  );

  const currentTheme = computed<BibleTheme>(() =>
    applyHighlightOverrides(
      applyOverrides(basePresetTheme.value, customOverrides.value),
      customHighlightOverrides.value
    )
  );

  // TODO: Listen for changes to the URL
  // os.addBotListener(configBot, "onBotChanged", (that: unknown) => {
  //   const changedTagsSource =
  //     that && typeof that === "object" && "tags" in that
  //       ? (that as { tags?: unknown }).tags
  //       : null;
  //   const changedTags = Array.isArray(changedTagsSource)
  //     ? changedTagsSource
  //     : [];

  //   if (changedTags.includes(TAG_THEME_ID)) {
  //     selectedThemeId.value = parseThemeId(
  //       configBot.tags[TAG_THEME_ID],
  //       DEFAULT_THEME_ID
  //     );
  //   }
  //   if (changedTags.includes(TAG_CUSTOM_THEME)) {
  //     customOverrides.value = parseCustomTheme(
  //       configBot.tags[TAG_CUSTOM_THEME]
  //     );
  //   }
  //   if (changedTags.includes(TAG_CUSTOM_HIGHLIGHTS)) {
  //     customHighlightOverrides.value = parseHighlightOverrides(
  //       configBot.tags[TAG_CUSTOM_HIGHLIGHTS]
  //     );
  //   }
  // });

  const setTheme = (themeId: string) => {
    if (themes.value.some((theme) => theme.id === themeId)) {
      selectedThemeId.value = themeId;

      // TODO: Update the URL here
      // configBot.tags[TAG_THEME_ID] = themeId;
      saveProfileConfigValue(login, PROFILE_THEME_ID, themeId);
    }
  };

  const writeOverrides = (next: ThemeOverrides) => {
    customOverrides.value = next;

    // TODO: Update the URL here
    // if (Object.keys(next).length === 0) {
    //   configBot.tags[TAG_CUSTOM_THEME] = "";
    // } else {
    //   configBot.tags[TAG_CUSTOM_THEME] = JSON.stringify(next);
    // }
    saveProfileConfigValue(login, PROFILE_CUSTOM_THEME, next);
  };

  const setCustomColor = (key: ThemeColorKey, value: string) => {
    writeOverrides({ ...customOverrides.value, [key]: value });
  };

  const resetCustomColor = (key: ThemeColorKey) => {
    const next = { ...customOverrides.value };
    delete next[key];
    writeOverrides(next);
  };

  const resetAllCustomColors = () => {
    writeOverrides({});
  };

  const writeHighlightOverrides = (next: HighlightOverrides) => {
    customHighlightOverrides.value = next;
    // TODO: Update the URL here
    // if (Object.keys(next).length === 0) {
    //   configBot.tags[TAG_CUSTOM_HIGHLIGHTS] = "";
    // } else {
    //   configBot.tags[TAG_CUSTOM_HIGHLIGHTS] = JSON.stringify(next);
    // }
    saveProfileConfigValue(login, PROFILE_CUSTOM_HIGHLIGHTS, next);
  };

  const setHighlightColor = (
    colorId: string,
    patch: Partial<ThemeHighlightColor>
  ) => {
    const current = customHighlightOverrides.value;
    const existing = current[colorId] ?? {};
    writeHighlightOverrides({
      ...current,
      [colorId]: { ...existing, ...patch },
    });
  };

  const resetHighlightColor = (colorId: string) => {
    const next = { ...customHighlightOverrides.value };
    delete next[colorId];
    writeHighlightOverrides(next);
  };

  const resetAllHighlightColors = () => {
    writeHighlightOverrides({});
  };

  return {
    themes,
    selectedThemeId,
    currentTheme,
    basePresetTheme,
    customOverrides,
    customHighlightOverrides,
    setTheme,
    setCustomColor,
    resetCustomColor,
    resetAllCustomColors,
    setHighlightColor,
    resetHighlightColor,
    resetAllHighlightColors,
  };
}
