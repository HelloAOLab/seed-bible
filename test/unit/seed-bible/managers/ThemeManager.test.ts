import {
  generateThemeCssClasses,
  generateThemeCssVariables,
  type BibleTheme,
} from "@packages/seed-bible/seed-bible/managers/ThemeManager";

describe("ThemeManager CSS helpers", () => {
  function createTheme(overrides: Partial<BibleTheme> = {}): BibleTheme {
    return {
      id: "test-theme",
      name: "Test Theme",
      variables: {
        primaryColor: "#111111",
        primaryFontColor: "#ffffff",
        secondaryColor: "#222222",
        secondaryFontColor: "#eeeeee",
        tertiaryColor: "#333333",
        background: "#fafafa",
        fontFamily: "Test Sans",
        fontColor: "#121212",
        readerBackground: "#ffffff",
        tabBorder: "none",
        tabBackground: "inherit",
        tabFontColor: "inherit",
        selectedTabBorder: "1px solid #111111",
        selectedTabBackground: "#f5f5f5",
        selectedTabFontColor: "#111111",
        readerToolbarHeight: null,
        sidebarBackground: null,
      },
      highlightColors: {
        yellow: {
          color: "#fff59d",
          fontColor: "#333333",
          wordsOfJesusFontColor: "#b45309",
        },
        mint: {
          color: "#86efac",
          fontColor: "#14532d",
          wordsOfJesusFontColor: "#166534",
        },
      },
      ...overrides,
    } as BibleTheme;
  }

  describe("generateThemeCssVariables", () => {
    it("converts theme variables into CSS custom properties", () => {
      const css = generateThemeCssVariables(createTheme());

      expect(css).toContain("--sb-primary-color: #111111;");
      expect(css).toContain("--sb-secondary-font-color: #eeeeee;");
      expect(css).toContain("--sb-font-family: Test Sans;");
      expect(css).toContain("--sb-selected-tab-font-color: #111111;");
      expect(css).toMatchSnapshot();
    });

    it("omits null and undefined theme variables", () => {
      const css = generateThemeCssVariables(createTheme());

      expect(css).not.toContain("--sb-reader-toolbar-height:");
      expect(css).not.toContain("--sb-sidebar-background:");
    });

    it("adds CSS custom properties for all highlight colors", () => {
      const css = generateThemeCssVariables(createTheme());

      expect(css).toContain("--sb-highlight-yellow-color: #fff59d;");
      expect(css).toContain("--sb-highlight-yellow-font-color: #333333;");
      expect(css).toContain(
        "--sb-highlight-yellow-words-of-jesus-font-color: #b45309;"
      );

      expect(css).toContain("--sb-highlight-mint-color: #86efac;");
      expect(css).toContain("--sb-highlight-mint-font-color: #14532d;");
      expect(css).toContain(
        "--sb-highlight-mint-words-of-jesus-font-color: #166534;"
      );
    });
  });

  describe("generateThemeCssClasses", () => {
    it("generates a highlight class for each highlight color", () => {
      const css = generateThemeCssClasses(createTheme());

      expect(css).toContain(".sb-highlight-yellow {");
      expect(css).toContain(".sb-highlight-mint {");
      expect(css).toMatchSnapshot();
    });

    it("uses CSS variables for normal and words-of-jesus text colors", () => {
      const css = generateThemeCssClasses(createTheme());

      expect(css).toContain(
        "background-color: var(--sb-highlight-yellow-color);"
      );
      expect(css).toContain("color: var(--sb-highlight-yellow-font-color);");
      expect(css).toContain("&.sb-words-of-jesus {");
      expect(css).toContain(
        "color: var(--sb-highlight-yellow-words-of-jesus-font-color);"
      );
    });
  });
});
