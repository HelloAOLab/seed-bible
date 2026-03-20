import { computed, signal } from "@preact/signals";

export interface BibleThemeVariables {
  primaryColor: string;
  secondaryColor: string;
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
   * The font family for selected verses. This can be used to differentiate selected verses from unselected verses, but can be customized as needed. If not set, it will default to the verseFontFamily.
   */
  selectedVerseFontFamily?: string | null;

  /**
   * The font color for selected verses. This can be used to differentiate selected verses from unselected verses, but should generally have good contrast against the readerBackground color for readability. If not set, it will default to the verseFontColor.
   */
  selectedVerseFontColor?: string | null;

  /**
   * The background color for selected verses. This can be used to highlight selected verses, but should generally be a light color with good contrast against the selectedVerseFontColor for readability. If not set, selected verses will not have a different background color than unselected verses.
   */
  selectedVerseBackgroundColor?: string | null;

  /**
   * The text decoration for selected verses (e.g. "underline", "line-through", "none"). This can be used to further differentiate selected verses from unselected verses, but can be customized as needed. If not set, it will default to "none".
   */
  selectedVerseTextDecoration?: string | null;

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
}

export interface BibleTheme {
  id: string;
  name: string;
  variables: BibleThemeVariables;
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

export function generateThemeCssVariables(
  variables: BibleThemeVariables
): string {
  return Object.entries(variables)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `--sb-${toKebabCase(key)}: ${value};`)
    .join("\n");
}

const DEFAULT_THEME_ID = "light";

const LIGHT_THEME: BibleTheme = {
  id: "light",
  name: "Light",
  variables: {
    primaryColor: "#e07b4c",
    secondaryColor: "#faddd1",
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

    selectedVerseFontFamily: "inherit",
    selectedVerseFontColor: "inherit",
    selectedVerseBackgroundColor: "inherit",
    selectedVerseTextDecoration: "underline",
    selectedVerseTextDecorationColor: "currentColor",

    hebrewSubtitleFontFamily: "Newsreader, serif",
    hebrewSubtitleFontColor: "#333",
    hebrewSubtitleFontStyle: "italic",

    readerToolbarBottom: "18px",
    readerToolbarGap: "10px",
    readerToolbarPadding: "8px 20px",
    readerToolbarBorderRadius: "10px",
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
  },
};

export type ThemeManager = ReturnType<typeof createTheme>;

export function createTheme() {
  const themes = signal<BibleTheme[]>([
    LIGHT_THEME,
    {
      id: "dark",
      name: "Dark",
      variables: {
        primaryColor: "#f0a67c",
        secondaryColor: "#5c463b",
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

        selectedVerseFontFamily: "inherit",
        selectedVerseFontColor: "inherit",
        selectedVerseBackgroundColor: "inherit",
        selectedVerseTextDecoration: "underline",
        selectedVerseTextDecorationColor: "currentColor",

        hebrewSubtitleFontFamily: "Newsreader, serif",
        hebrewSubtitleFontColor: "#d7deef",
        hebrewSubtitleFontStyle: "italic",

        readerToolbarBottom: "18px",
        readerToolbarGap: "10px",
        readerToolbarPadding: "8px 20px",
        readerToolbarBorderRadius: "10px",
        readerToolbarBackground: "#1a2230",
        readerToolbarBorder: "1px solid rgba(255, 255, 255, 0.08)",
        readerToolbarBoxShadow: "0 26px 10px rgba(0, 0, 0, 0.4)",
        readerToolbarZIndex: "99",
        readerToolbarHeight: "50px",
        readerToolbarFloatingButtonTop: "-68px",
        readerToolbarFloatingButtonWidth: "48px",
        readerToolbarFloatingButtonHeight: "48px",
        readerToolbarFloatingButtonBorder:
          "1px solid rgba(255, 255, 255, 0.08)",
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
      },
    },
  ]);

  const selectedThemeId = signal<string>(DEFAULT_THEME_ID);

  const currentTheme = computed(
    () =>
      themes.value.find((theme) => theme.id === selectedThemeId.value) ??
      themes.value[0] ??
      LIGHT_THEME
  );

  const setTheme = (themeId: string) => {
    if (themes.value.some((theme) => theme.id === themeId)) {
      selectedThemeId.value = themeId;
    }
  };

  return {
    themes,
    selectedThemeId,
    currentTheme,
    setTheme,
  };
}
