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
   * The font family for Hebrew text. This should generally be a font that supports Hebrew characters and is optimized for readability, but can be customized as needed.
   */
  hebrewSubtitleFontFamily?: string | null;

  /**
   * The font color for Hebrew text. This should generally have good contrast against the readerBackground color for readability, but can be customized as needed.
   */
  hebrewSubtitleFontColor?: string | null;
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
    .map(([key, value]) => `--sb-${toKebabCase(key)}: ${value};`)
    .join("\n");
}

const DEFAULT_THEME_ID = "light";

const LIGHT_THEME: BibleTheme = {
  id: "light",
  name: "Light",
  variables: {
    primaryColor: "#3c6fe8",
    secondaryColor: "#d8d8d8",
    tertiaryColor: "#f0f0f0",

    background: "#F8FAFC",

    sidebarBackground: "transparent",
    readerBackground: "#ffffff",

    bookSelectorBackground: "#ffffff",
    fontFamily: "Satoshi, system-ui, sans-serif",
    fontColor: "#222222",

    verseFontFamily: "Newsreader, serif",
    verseFontColor: "#2f2f2f",
    verseCursor: "text",
    bookTitleFontColor: "#1f2b57",

    chapterHeadingFontFamily: "Plus Jakarta Sans, sans-serif",
    chapterHeadingFontColor: "inherit",
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
        primaryColor: "#4d87ff",
        secondaryColor: "#444b5b",
        tertiaryColor: "#2f3542",
        sidebarBackground: "#1f2430",
        readerBackground: "#151922",
        bookSelectorBackground: "#1e242f",

        fontFamily: "Satoshi, system-ui, sans-serif",
        fontColor: "#eceff4",

        verseFontFamily: "Newsreader, serif",
        verseFontColor: "#d6dbe5",
        bookHeadingColor: "#9cbaff",

        chapterHeadingFontFamily: "Plus Jakarta Sans, sans-serif",
        chapterHeadingFontColor: "inherit",
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
