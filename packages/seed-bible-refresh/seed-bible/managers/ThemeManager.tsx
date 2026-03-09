import { signal } from "https://esm.sh/@preact/signals?deps=preact@10.28.4";

export interface BibleThemeVariables {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  sidebarBackground: string;
  readerBackground: string;
  bookSelectorBackground: string;
  fontColor: string;
  verseTextColor: string;
  bookHeadingColor: string;
  chapterHeadingColor: string;
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
    .map(([key, value]) => `--${toKebabCase(key)}: ${value};`)
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
    sidebarBackground: "#f8f8f8",
    readerBackground: "#ffffff",
    bookSelectorBackground: "#f7f7f7",
    fontColor: "#222222",
    verseTextColor: "#2f2f2f",
    bookHeadingColor: "#1f2b57",
    chapterHeadingColor: "#5f2d85",
  },
};

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
      fontColor: "#eceff4",
      verseTextColor: "#d6dbe5",
      bookHeadingColor: "#9cbaff",
      chapterHeadingColor: "#d1a8ff",
    },
  },
]);

const selectedThemeId = signal<string>(DEFAULT_THEME_ID);

export function useTheme() {
  const currentTheme =
    themes.value.find((theme) => theme.id === selectedThemeId.value) ??
    themes.value[0] ??
    LIGHT_THEME;

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
