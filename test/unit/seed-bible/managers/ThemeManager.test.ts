import {
  createTheme as createThemeManager,
  composeThemeStyleText,
  THEME_PRESET_STYLE_TEXT,
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

  describe("composeThemeStyleText", () => {
    it("scopes the composed CSS to body, not :root or html", () => {
      const css = composeThemeStyleText(createTheme());

      expect(css.trimStart().startsWith("body {")).toBe(true);
      expect(css).not.toContain(":root");
    });

    it("strips a literal < from a custom override value, preventing a </style breakout", () => {
      // Custom theme/highlight overrides are free text — not validated for
      // CSS syntax (see filterValidColorOverrides) — and this text gets
      // spliced as a raw string into index.html server-side. A `<` here
      // could otherwise close the <style> tag it's injected into early.
      const css = composeThemeStyleText(
        createTheme({
          variables: {
            ...createTheme().variables,
            primaryColor: "</style><script>alert(1)</script>",
          },
        })
      );

      expect(css).not.toContain("<");
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
    // `hydrateLocalConfig()` mirrors the real app's post-mount effect (see
    // `MainBody` in `app/main.tsx`) — `localConfig` itself seeds empty to
    // match SSR.
    const login2 = createLoginManager({ os });
    login2.hydrateLocalConfig();
    const settings2 = createSettings(os, login2, nav);
    const theme2 = createThemeManager(settings2);

    expect(theme2.selectedThemeId.value).toBe("dark");
  });

  it("writes the active theme's CSS to a #sb-theme-styles tag in document.head, outside the Preact tree", () => {
    document.getElementById("sb-theme-styles")?.remove();
    const login = makeFakeLogin(null);
    const settings = makeSettings(login);
    const theme = createThemeManager(settings);

    let tag = document.getElementById("sb-theme-styles");
    expect(tag).not.toBeNull();
    expect(tag?.tagName).toBe("STYLE");
    expect(tag?.textContent).toContain("body {");

    theme.setTheme("dark");

    // Same tag, updated in place — not a second one appended.
    tag = document.getElementById("sb-theme-styles");
    expect(document.head.querySelectorAll("#sb-theme-styles")).toHaveLength(1);
    expect(tag?.textContent).toContain("--sb-background: #0a0a0a;");
  });

  it("does not clobber a dark #sb-theme-styles tag with the light default on boot", () => {
    // Boot order on a returning visitor whose saved theme is dark: the server
    // renders the light default into the tag, then the pre-hydration inline
    // script in index.html reads localStorage and patches it to dark, and only
    // then does the bundle run createSeedBibleState() -> createTheme(). At that
    // point `localConfig` is still the empty SSR-matching seed, so `themeId` is
    // "light" — writing it here would flash the page light until
    // `hydrateLocalConfig()` restores the real id post-mount.
    const darkCss = THEME_PRESET_STYLE_TEXT.dark ?? "";
    expect(darkCss).toContain("--sb-background: #0a0a0a;");

    document.getElementById("sb-theme-styles")?.remove();
    const tag = document.createElement("style");
    tag.id = "sb-theme-styles";
    tag.textContent = darkCss;
    document.head.appendChild(tag);

    const login = makeFakeLogin(null);
    const settings = makeSettings(login);
    const theme = createThemeManager(settings);

    expect(theme.selectedThemeId.value).toBe("light");
    expect(document.getElementById("sb-theme-styles")?.textContent).toBe(
      darkCss
    );

    // ...and once the real saved config lands, the tag still tracks it.
    login.localConfig.value = { themeId: "dark" };
    expect(document.getElementById("sb-theme-styles")?.textContent).toContain(
      "--sb-background: #0a0a0a;"
    );
  });

  it("still takes over a #sb-theme-styles tag that was never filled in", () => {
    // Dev server / any host that leaves the placeholder unsubstituted: there is
    // no real theme in the tag, so deferring to it would leave the page
    // unstyled. The effect must write on its first run here.
    document.getElementById("sb-theme-styles")?.remove();
    const tag = document.createElement("style");
    tag.id = "sb-theme-styles";
    tag.textContent = "<!-- THEME_STYLE_TAG -->";
    document.head.appendChild(tag);

    const login = makeFakeLogin(null);
    const settings = makeSettings(login);
    createThemeManager(settings);

    expect(document.getElementById("sb-theme-styles")?.textContent).toContain(
      "--sb-background:"
    );
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
