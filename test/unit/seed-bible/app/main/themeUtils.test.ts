import {
  defaultTheme,
  darkTheme,
  LigonierTheme,
  Ligonier2Theme,
  getThemeObject,
} from "@packages/seed-bible/app/main/themeUtils";

describe("themeUtils", () => {
  describe("theme objects", () => {
    const themes = [
      { name: "defaultTheme", theme: defaultTheme },
      { name: "darkTheme", theme: darkTheme },
      { name: "LigonierTheme", theme: LigonierTheme },
      { name: "Ligonier2Theme", theme: Ligonier2Theme },
    ];

    // Required keys that every theme must define for the app to render correctly
    const requiredKeys = [
      "primaryColor",
      "secondaryColor",
      "tertiaryColor",
      "pageBackground",
      "pageTextColor",
      "primaryButton",
      "primaryButtonColor",
      "toolbarBackground",
      "iconColor",
      "text1",
      "text2",
      "background",
      "onBackground",
      "surface",
      "onSurface",
    ];

    it.each(themes)(
      "$name should have all required theme keys",
      ({ theme }) => {
        for (const key of requiredKeys) {
          expect(theme).toHaveProperty(key);
        }
      }
    );

    it.each(themes)(
      "$name should have string values for color properties",
      ({ theme }) => {
        // Check that color properties are strings (not undefined/null)
        expect(typeof theme.primaryColor).toBe("string");
        expect(typeof theme.pageBackground).toBe("string");
        expect(typeof theme.pageTextColor).toBe("string");
      }
    );

    it("defaultTheme should use light colors", () => {
      expect(defaultTheme.pageBackground).toBe("#FFFFFF");
      expect(defaultTheme.pageTextColor).toBe("#333333");
    });

    it("darkTheme should use dark colors", () => {
      expect(darkTheme.pageBackground).toBe("#121212");
      expect(darkTheme.pageTextColor).toBe("#FFFFFF");
    });

    it("all themes should define filter-mode", () => {
      for (const theme of [
        defaultTheme,
        darkTheme,
        LigonierTheme,
        Ligonier2Theme,
      ]) {
        expect(theme["filter-mode"]).toBeDefined();
        expect(typeof theme["filter-mode"]).toBe("string");
      }
    });

    it("all themes should have consistent key sets", () => {
      // Default and dark themes should have the same keys
      const defaultKeys = Object.keys(defaultTheme).sort();
      const darkKeys = Object.keys(darkTheme).sort();
      expect(defaultKeys).toEqual(darkKeys);
    });
  });

  describe("getThemeObject", () => {
    it("should return defaultTheme for 'light'", () => {
      expect(getThemeObject("light")).toBe(defaultTheme);
    });

    it("should return darkTheme for 'dark'", () => {
      expect(getThemeObject("dark")).toBe(darkTheme);
    });

    it("should return LigonierTheme for 'ligonier'", () => {
      expect(getThemeObject("ligonier")).toBe(LigonierTheme);
    });

    it("should return Ligonier2Theme for 'ligonier2'", () => {
      expect(getThemeObject("ligonier2")).toBe(Ligonier2Theme);
    });

    it("should return defaultTheme for an unknown theme", () => {
      // @ts-expect-error testing unknown value
      expect(getThemeObject("nonexistent")).toBe(defaultTheme);
    });
  });
});
