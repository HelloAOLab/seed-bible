import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
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
  cyan: ThemeHighlightColor;
  blue: ThemeHighlightColor;
  red: ThemeHighlightColor;
  magenta: ThemeHighlightColor;
  pink: ThemeHighlightColor;
  purple: ThemeHighlightColor;
  orange: ThemeHighlightColor;
  cream: ThemeHighlightColor;
  gray: ThemeHighlightColor;
  tan: ThemeHighlightColor;

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
  // Highlighted text keeps a readable font color; the highlight *background* is
  // drawn behind the text by the ribbon layer (from `--sb-highlight-<id>-color`),
  // not as a `background-color` here.
  return Object.entries(theme.highlightColors)
    .map(([colorId]) => {
      return [
        `.sb-highlight-${colorId} {`,
        `color: var(--sb-highlight-${colorId}-font-color);`,
        `&.sb-words-of-jesus { `,
        `color: var(--sb-highlight-${colorId}-words-of-jesus-font-color);`,
        `}`,
        ` }`,
      ].join("\n");
    })
    .join("\n");
}

/**
 * `<style>`-ready text for a theme (variables + highlight classes), scoped
 * to `body` — NOT `:root`/`html`. See CLAUDE.md: `ThemeManager`'s
 * body-scoped custom properties beat `base.css`'s `:root` block via DOM-
 * proximity inheritance, not CSS specificity, so wherever this text ends up
 * in the document, the selector inside it must stay `body`.
 *
 * `<` is stripped defensively: it never appears in a legitimate value here
 * (colors, sizes, font names), and custom theme/highlight overrides are
 * free text that isn't validated for CSS syntax (see
 * `filterValidColorOverrides` below — it only checks for a non-empty
 * string). This text ends up spliced as a raw string into `index.html`
 * server-side (see `entry-ssr.tsx`'s `THEME_STYLE_TAG` substitution), so an
 * override containing `</style` could otherwise break out of that tag.
 */
export function composeThemeStyleText(theme: BibleTheme): string {
  const css = `body {\n${generateThemeCssVariables(theme)}\n}\n${generateThemeCssClasses(theme)}`;
  return css.replace(/</g, "");
}

const LIGHT_THEME: BibleTheme = {
  id: "light",
  name: "Light",
  variables: {
    primaryColor: "#e07b4c",
    primaryFontColor: "#fff",

    secondaryColor: "#faddd1",
    secondaryFontColor: "#333",

    tertiaryColor: "#f0f0f0",

    linkColor: "#e07b4c",
    linkVisitedColor: "#8d5a6b",

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

    fontFamily: "system-ui, sans-serif",
    fontColor: "#333",

    bookTitleFontFamily: "Newsreader, serif",
    bookTitleFontColor: "#333",

    chapterHeadingFontFamily: "Plus Jakarta Sans, sans-serif",
    chapterHeadingFontColor: "#333",
    chapterHeadingFontStyle: "normal",

    verseFontFamily: "Plus Jakarta Sans, sans-serif",
    verseFontColor: "#333",
    verseCursor: "pointer",

    selectedVerseBorderBottom: "none",
    selectedVerseTextDecoration: "underline dotted",
    selectedVerseTextDecorationColor: "currentColor",

    hebrewSubtitleFontFamily: "Newsreader, serif",
    hebrewSubtitleFontColor: "#333",
    hebrewSubtitleFontStyle: "italic",

    readerToolbarBottom: "1.125rem",
    readerToolbarGap: "0.25rem",
    readerToolbarPadding: "1px 0.3125rem",
    readerToolbarBorderRadius: "1.25rem",
    readerToolbarBackground: "#ffffff",
    readerToolbarBorder: "1px solid #00000024",
    readerToolbarBoxShadow:
      "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
    readerToolbarZIndex: "99",
    readerToolbarHeight: "auto",

    readerToolbarFloatingButtonTop: "-4.25rem",
    readerToolbarFloatingButtonWidth: "3rem",
    readerToolbarFloatingButtonHeight: "3rem",
    readerToolbarFloatingButtonBorder: "1px solid #00000024",
    readerToolbarFloatingButtonBorderRadius: "62.4375rem",
    readerToolbarFloatingButtonBackground: "#ffffff",
    readerToolbarFloatingButtonFontColor: "#333",
    readerToolbarFloatingButtonBoxShadow: "0 10px 24px #0000001a",

    verseToolbarGap: "0.125rem",
    verseToolbarPadding: "0.25rem 0.5rem",
    verseToolbarBorderRadius: "0.625rem",
    verseToolbarBorder: "1px solid var(--sb-divider-color)",
    verseToolbarBoxShadow: "0 26px 10px var(--sb-shadow-color)",
    verseToolbarZIndex: "100",
    verseToolbarMinHeight: "0",

    readerToolbarMobileLayoutHeight: "auto",
    readerToolbarMobileLayoutPadding: "0.625rem 2.1875rem",
    readerToolbarMobileLayoutGap: "1rem",
    readerToolbarMobileLayoutItemSize: "2.75rem",
    readerToolbarMobileLayoutCenterButtonWidth: "5.4375rem",
    readerToolbarMobileLayoutCenterButtonHeight: "2.625rem",
    readerToolbarMobileLayoutButtonBorderRadius: "2.5rem",

    readerToolbarFloatingButtonSideOffset: "1rem",

    verseToolbarToolsGap: "0.125rem",
    verseToolbarMobileBottom: "1.125rem",

    menuBackground: "#ffffff",
    menuFontColor: "#333",

    toolbarIconInvert: "0",

    readerToolbarFontColor: "#333",
    readerToolbarFontFamily: "system-ui, sans-serif",

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
    cyan: {
      color: "#80deea",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    blue: {
      color: "#90caf9",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    red: {
      color: "#ef9a9a",
      fontColor: "#333",
      wordsOfJesusFontColor: "#c62828",
    },
    magenta: {
      color: "#ea80fc",
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
    cream: {
      color: "#fff8e1",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    gray: {
      color: "#cfd8dc",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
    tan: {
      color: "#e0c9a6",
      fontColor: "#333",
      wordsOfJesusFontColor: "#e07b4c",
    },
  },
};

const DARK_THEME: BibleTheme = {
  id: "dark",
  name: "Dark",
  variables: {
    primaryColor: "#e6e6e6",
    primaryFontColor: "#111111",

    secondaryColor: "#262626",
    secondaryFontColor: "#f5f5f5",

    tertiaryColor: "#1c1c1c",

    linkColor: "#e07b4c",
    linkVisitedColor: "#d99bb0",

    background: "#0a0a0a",

    sidebarBackground: "#0f0f0f",
    sidebarFontFamily: "inherit",
    sidebarFontColor: "#e6e6e6",

    readerBackground: "#121212",
    readerFontFamily: "inherit",
    readerFontColor: "#e6e6e6",

    bookSelectorBackground: "#181818",
    bookSelectorFontFamily: "inherit",
    bookSelectorFontColor: "#e6e6e6",

    fontFamily: "system-ui, sans-serif",
    fontColor: "#e6e6e6",

    bookTitleFontFamily: "Newsreader, serif",
    bookTitleFontColor: "#fafafa",

    chapterHeadingFontFamily: "Plus Jakarta Sans, sans-serif",
    chapterHeadingFontColor: "#e6e6e6",
    chapterHeadingFontStyle: "normal",

    verseFontFamily: "Plus Jakarta Sans, sans-serif",
    verseFontColor: "#e6e6e6",
    verseCursor: "pointer",

    selectedVerseBorderBottom: "none",
    selectedVerseTextDecoration: "underline dotted",
    selectedVerseTextDecorationColor: "currentColor",

    hebrewSubtitleFontFamily: "Newsreader, serif",
    hebrewSubtitleFontColor: "#e6e6e6",
    hebrewSubtitleFontStyle: "italic",

    readerToolbarBottom: "1.125rem",
    readerToolbarGap: "0.25rem",
    readerToolbarPadding: "1px 0.3125rem",
    readerToolbarBorderRadius: "1.25rem",
    readerToolbarBackground: "#181818",
    readerToolbarBorder: "1px solid rgba(255, 255, 255, 0.1)",
    readerToolbarBoxShadow: "0 26px 10px rgba(0, 0, 0, 0.5)",
    readerToolbarZIndex: "99",
    readerToolbarHeight: "auto",
    readerToolbarFloatingButtonTop: "-4.25rem",
    readerToolbarFloatingButtonWidth: "3rem",
    readerToolbarFloatingButtonHeight: "3rem",
    readerToolbarFloatingButtonBorder: "1px solid rgba(255, 255, 255, 0.1)",
    readerToolbarFloatingButtonBorderRadius: "62.4375rem",
    readerToolbarFloatingButtonBackground: "#181818",
    readerToolbarFloatingButtonFontColor: "#e6e6e6",
    readerToolbarFloatingButtonBoxShadow: "0 10px 24px rgba(0, 0, 0, 0.5)",

    verseToolbarGap: "0.125rem",
    verseToolbarPadding: "0.25rem 0.5rem",
    verseToolbarBorderRadius: "0.625rem",
    verseToolbarBorder: "1px solid var(--sb-divider-color)",
    verseToolbarBoxShadow: "0 26px 10px var(--sb-shadow-color)",
    verseToolbarZIndex: "100",
    verseToolbarMinHeight: "0",

    readerToolbarMobileLayoutHeight: "auto",
    readerToolbarMobileLayoutPadding: "0.625rem 2.1875rem",
    readerToolbarMobileLayoutGap: "1rem",
    readerToolbarMobileLayoutItemSize: "2.75rem",
    readerToolbarMobileLayoutCenterButtonWidth: "5.4375rem",
    readerToolbarMobileLayoutCenterButtonHeight: "2.625rem",
    readerToolbarMobileLayoutButtonBorderRadius: "2.5rem",

    readerToolbarFloatingButtonSideOffset: "1rem",

    verseToolbarToolsGap: "0.125rem",
    verseToolbarMobileBottom: "1.125rem",

    menuBackground: "#181818",
    menuFontColor: "#e6e6e6",

    toolbarIconInvert: "1",

    readerToolbarFontColor: "#e6e6e6",
    readerToolbarFontFamily: "system-ui, sans-serif",

    dividerColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "rgba(0, 0, 0, 0.6)",

    tabBorder: "1px solid transparent",
    tabBackground: "inherit",
    tabFontColor: "inherit",

    selectedTabBorder: "1px solid var(--sb-primary-color)",
    selectedTabBackground: "var(--sb-secondary-color)",
    selectedTabFontColor: "var(--sb-primary-color)",
  },
  // Dark-theme highlights are solid, saturated-but-dark versions of each hue
  // rather than the bright pastels used in light mode. They read as clearly
  // colorful and distinct from one another, yet stay dark enough that white
  // text stays legible on top. The font color is an explicit white (`#ffffff`)
  // rather than `inherit` — inherit resolved to a non-white color in practice,
  // so it is pinned here to guarantee the highlighted verse text stays white.
  // (Translucent tints were tried first but blending low-opacity colors into
  // the near-black background dragged every hue toward gray — they came out
  // muddy and washed out, so solid colors are used.)
  highlightColors: {
    yellow: {
      color: "#756a0a",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    green: {
      color: "#2f6d3a",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    cyan: {
      color: "#1a6b73",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    blue: {
      color: "#2f5f9e",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    red: {
      color: "#8e3a3a",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    magenta: {
      color: "#7a2f6e",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    pink: {
      color: "#93395c",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    purple: {
      color: "#5b4489",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    orange: {
      color: "#98551c",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    cream: {
      color: "#6b6040",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    gray: {
      color: "#4a4a4a",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
    tan: {
      color: "#6d4c33",
      fontColor: "#ffffff",
      wordsOfJesusFontColor: "#ff9e80",
    },
  },
};

/**
 * Precomposed style text for the two built-in presets, with no custom
 * overrides applied. Consumed both server-side (`entry-ssr.tsx` seeds a
 * `<!-- THEME_PRESETS_JSON -->` payload from this) and by the pre-hydration
 * inline script in `index.html`, which reads it before any JS bundle loads.
 * Keeping this as the one place that composes preset text is what keeps
 * that script and the runtime effect below from silently diverging.
 */
export const THEME_PRESET_STYLE_TEXT: Record<string, string> = {
  [LIGHT_THEME.id]: composeThemeStyleText(LIGHT_THEME),
  [DARK_THEME.id]: composeThemeStyleText(DARK_THEME),
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
      { key: "linkColor", label: "Link" },
      { key: "linkVisitedColor", label: "Visited link" },
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

export const DEFAULT_HIGHLIGHT_IDS = [
  "yellow",
  "green",
  "cyan",
  "blue",
  "red",
  "magenta",
  "pink",
  "purple",
  "orange",
  "cream",
  "gray",
  "tan",
] as const;

export type HighlightId = (typeof DEFAULT_HIGHLIGHT_IDS)[number];

type ThemeOverrides = Partial<Record<ThemeColorKey, string>>;
type HighlightOverrides = Record<string, Partial<ThemeHighlightColor>>;

const THEME_COLOR_KEYS: ThemeColorKey[] = THEME_COLOR_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key)
);

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

/**
 * Filters a raw, already-decoded color-override record down to the keys the
 * customization UI actually exposes. `SettingsManager` stores/decodes the
 * raw `Record<string, string>` (it doesn't know about `ThemeColorKey`); this
 * is the theme-domain validation layered on top of that generic storage.
 */
function filterValidColorOverrides(
  raw: Record<string, string>
): ThemeOverrides {
  const overrides: ThemeOverrides = {};
  for (const key of THEME_COLOR_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) {
      overrides[key] = value;
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

export function createTheme(settings: SettingsManager): ThemeManager {
  const themes = signal<BibleTheme[]>([LIGHT_THEME, DARK_THEME]);

  const selectedThemeId = computed(() => settings.settings.value.themeId);
  const customOverrides = computed(() =>
    filterValidColorOverrides(settings.settings.value.customTheme)
  );
  const customHighlightOverrides = computed(
    () => settings.settings.value.customHighlights
  );

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

  const themeStyleText = computed(() =>
    composeThemeStyleText(currentTheme.value)
  );

  // Writes the active theme (preset + custom overrides) directly to a
  // <head> <style> tag, entirely outside the Preact tree. This is a plain
  // @preact/signals `effect()`, not `useEffect` — it runs synchronously the
  // moment `createTheme()` is called (during `createSeedBibleState()`,
  // before Preact's first render/hydrate pass), same as the in-tree
  // <style> this replaced used to, but the target (document.head) is never
  // diffed by Preact, so there is no hydration-mismatch class of bug here
  // at all — unlike theme id (see LoginManager.hydrateLocalConfig), this
  // needs no deferral.
  //
  // Reuses id "sb-theme-styles" — the SAME id the SSR-rendered <style> tag
  // in index.html carries, and the same id the pre-hydration inline script
  // writes to. All three converge on one element; each overwrite is
  // idempotent, and whichever runs last simply wins.
  if (typeof document !== "undefined") {
    effect(() => {
      let tag = document.getElementById(
        "sb-theme-styles"
      ) as HTMLStyleElement | null;
      if (!tag) {
        tag = document.createElement("style");
        tag.id = "sb-theme-styles";
        document.head.appendChild(tag);
      }
      tag.textContent = themeStyleText.value;
    });
  }

  const setTheme = (themeId: string) => {
    if (themes.value.some((theme) => theme.id === themeId)) {
      settings.setThemeId(themeId);
    }
  };

  const writeOverrides = (next: ThemeOverrides) => {
    settings.setCustomTheme(next);
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
    settings.setCustomHighlights(next);
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
