import {
  createTheme as createThemeManager,
  generateThemeCssClasses,
  generateThemeCssVariables,
  type BibleTheme,
} from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import {
  createSettings,
  type SettingsManager,
} from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import {
  createLoginManager,
  type LoginManager,
  type UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";

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

      // The highlight background is drawn by the ribbon layer, not as a
      // background-color on the text.
      expect(css).not.toContain("background-color");
      expect(css).toContain("color: var(--sb-highlight-yellow-font-color);");
      expect(css).toContain("&.sb-words-of-jesus {");
      expect(css).toContain(
        "color: var(--sb-highlight-yellow-words-of-jesus-font-color);"
      );
    });
  });
});

/**
 * Minimal LoginManager stand-in, matching the one in
 * `SettingsManager.test.ts` — `createTheme` now reads/writes exclusively
 * through `SettingsManager`, so these tests build a real `SettingsManager`
 * against a fake `login` and pass it in, rather than touching `login`
 * directly.
 */
function makeFakeLogin(initialProfile: UserProfile | null): LoginManager {
  const userId = signal<string | null>(initialProfile ? "user-1" : null);
  const profile = signal<UserProfile | null>(initialProfile);
  const localConfig = signal<Record<string, unknown>>({});
  return {
    userId,
    profile,
    localConfig,
    profilePromise: Promise.resolve(initialProfile),
    updateProfile: (newData: Partial<UserProfile>) => {
      if (!profile.value) return;
      profile.value = { ...profile.value, ...newData };
    },
  } as unknown as LoginManager;
}

function navWith(hrefSuffix = ""): ReturnType<typeof createNavigationManager> {
  return createNavigationManager({
    initialHref: `http://localhost:3000/${hrefSuffix}`,
  });
}

function makeSettings(login: LoginManager, hrefSuffix = ""): SettingsManager {
  return createSettings(CasualOSManager(), login, navWith(hrefSuffix));
}

describe("ThemeManager storage (via SettingsManager)", () => {
  it("setTheme persists to the profile when logged in", () => {
    const login = makeFakeLogin({ name: "Test", config: {} } as UserProfile);
    const settings = makeSettings(login);
    const theme = createThemeManager(settings);

    theme.setTheme("dark");

    expect(theme.selectedThemeId.value).toBe("dark");
    expect((login.profile.value as any)?.config?.themeId).toBe("dark");
  });

  it("setTheme rejects an id that isn't in the themes list", () => {
    const login = makeFakeLogin(null);
    const settings = makeSettings(login);
    const theme = createThemeManager(settings);

    theme.setTheme("not-a-real-theme");

    expect(theme.selectedThemeId.value).toBe("light");
  });

  it("an anonymous theme choice survives a simulated page refresh", () => {
    const os = CasualOSManager();
    const nav = navWith();
    const login1 = createLoginManager({ os });
    const settings1 = createSettings(os, login1, nav);
    const theme1 = createThemeManager(settings1);

    theme1.setTheme("dark");

    // Simulate a fresh page load: brand-new manager instances sharing the
    // same (real) localStorage that `login1`'s anonymous write persisted to.
    // This is the bug the refactor fixes — ThemeManager used to write
    // anonymous edits to `login.localConfig` but never read them back.
    const login2 = createLoginManager({ os });
    const settings2 = createSettings(os, login2, nav);
    const theme2 = createThemeManager(settings2);

    expect(theme2.selectedThemeId.value).toBe("dark");
  });

  it("?app.themeId sets only the starting value and doesn't fight a later setTheme call", () => {
    const login = makeFakeLogin(null);
    const settings = makeSettings(login, "?app.themeId=dark");
    const theme = createThemeManager(settings);

    expect(theme.selectedThemeId.value).toBe("dark");

    theme.setTheme("light");

    expect(login.localConfig.value.themeId).toBe("light");
    expect(theme.selectedThemeId.value).toBe("light");
  });

  it("setCustomColor / resetCustomColor read back correctly through settings", () => {
    const login = makeFakeLogin(null);
    const settings = makeSettings(login);
    const theme = createThemeManager(settings);

    theme.setCustomColor("primaryColor", "#123456");
    expect(theme.customOverrides.value.primaryColor).toBe("#123456");
    expect(login.localConfig.value.customTheme).toEqual({
      primaryColor: "#123456",
    });

    theme.resetCustomColor("primaryColor");
    expect(theme.customOverrides.value.primaryColor).toBeUndefined();
  });

  it("setHighlightColor / resetHighlightColor read back correctly through settings", () => {
    const login = makeFakeLogin(null);
    const settings = makeSettings(login);
    const theme = createThemeManager(settings);

    theme.setHighlightColor("yellow", { color: "#ffff00" });
    expect(theme.customHighlightOverrides.value.yellow?.color).toBe("#ffff00");

    theme.resetHighlightColor("yellow");
    expect(theme.customHighlightOverrides.value.yellow).toBeUndefined();
  });
});
