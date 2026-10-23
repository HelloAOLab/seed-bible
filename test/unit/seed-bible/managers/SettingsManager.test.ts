import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import {
  createSettings,
  DEFAULT_VERSE_LINE_HEIGHT,
  type AppSettings,
} from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import {
  createLoginManager,
  type LoginManager,
  type UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { TranslationWithLanguage } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { signal } from "@preact/signals";

/**
 * Minimal LoginManager stand-in. `updateProfile` optimistically updates the
 * `profile` signal the same way the real manager does, which is what
 * SettingsManager's profile-language effect and profile/localConfig fallback
 * reads subscribe to.
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

function profileWithLang(lang: string): UserProfile {
  return { name: "Test", config: { lang } } as unknown as UserProfile;
}

function getProfileLang(login: LoginManager): string | undefined {
  return (login.profile.value as { config?: { lang?: string } } | null)?.config
    ?.lang;
}

function navWith(hrefSuffix = ""): ReturnType<typeof createNavigationManager> {
  return createNavigationManager({
    initialHref: `http://localhost:3000/${hrefSuffix}`,
  });
}

describe("SettingsManager language handling", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["en-US"],
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  // Regression for #1443: changing the UI language in the settings screen
  // must change the interface language, not only the scripture translation.
  // The bug was that the manager re-applied the profile's still-unsaved
  // previous language whenever the URL changed — reverting the switch. (URL
  // writing for the language itself has since moved to TabsManager, which
  // folds language/translation/book/chapter into one coordinated path, so
  // this test no longer asserts on a `?lang=` query param — the language
  // and translation signals themselves are the source of truth here.)
  it("keeps a logged-in user's newly selected UI language (does not revert to the profile's previous language)", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const i18n = createI18nManager(nav, ["en"]);
    await i18n.ready;

    const login = makeFakeLogin(profileWithLang("en"));
    const settings = createSettings(CasualOSManager(), login, nav);
    // Selector-driven changes persist to the profile via this wiring (done by
    // SeedBibleState in production).
    i18n.setLanguagePersister(settings.persistLanguage);

    let appliedTranslation: string | null = null;
    const apply = vi.fn(async (translation: TranslationWithLanguage) => {
      appliedTranslation = translation.id;
    });
    i18n.setBibleTranslationApplicator(
      apply,
      () => [{ id: "fra_onbv", language: "fra" } as Translation],
      null
    );

    await i18n.requestLanguageChange("fr");
    // Let any queued microtasks / async effects settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Primary effect: the UI language changed and stuck (didn't revert).
    expect(i18n.language.value).toBe("fr");
    // Secondary effect: the scripture translation changed too.
    expect(appliedTranslation).toBe("fra_onbv");
    // The new language is persisted back to the profile.
    expect(getProfileLang(login)).toBe("fr");
  });

  it("applies the profile's saved language when the profile loads (e.g. on login)", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const i18n = createI18nManager(nav, ["en"]);
    await i18n.ready;
    expect(i18n.language.value).toBe("en");

    // Start logged out, then "log in" by populating the profile signal.
    const login = makeFakeLogin(null);
    createSettings(CasualOSManager(), login, nav);

    login.profile.value = profileWithLang("fr");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(i18n.language.value).toBe("fr");
  });

  // A shared deep link or browser back/forward changes the displayed
  // language, but must NOT overwrite the account's saved language — only the
  // in-app selector persists. URL <-> language sync now lives in
  // TabsManager, which reacts to an external navigation by calling
  // `changeLanguage` directly (never `requestLanguageChange` — see
  // `syncSelectedTabFromUrl`), so that's what this simulates directly rather
  // than driving it through a real URL push.
  it("does not persist a directly-applied (non-selector) language change to the profile", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const i18n = createI18nManager(nav, ["en"]);
    await i18n.ready;

    const login = makeFakeLogin(profileWithLang("en"));
    const settings = createSettings(CasualOSManager(), login, nav);
    i18n.setLanguagePersister(settings.persistLanguage);

    await i18n.changeLanguage("de");

    // The displayed language switched ...
    expect(i18n.language.value).toBe("de");
    // ... but the saved profile language is untouched.
    expect(getProfileLang(login)).toBe("en");
  });

  it("persists a selector-driven change even when the language matches no prior profile value", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const i18n = createI18nManager(nav, ["en"]);
    await i18n.ready;

    // Logged-in user with no saved language yet.
    const login = makeFakeLogin({
      name: "Test",
      config: {},
    } as unknown as UserProfile);
    const settings = createSettings(CasualOSManager(), login, nav);
    i18n.setLanguagePersister(settings.persistLanguage);
    i18n.setBibleTranslationApplicator(vi.fn(), () => null, null);

    await i18n.requestLanguageChange("de");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getProfileLang(login)).toBe("de");
  });
});

// The agreement reached on PR #1444 for how the incoming `?lang=` URL
// parameter interacts with the account's saved language:
//   1. Signed in WITH a saved language  -> profile overrides the URL param.
//   2. Signed in WITHOUT a saved language -> use the URL param.
//   3. Not signed in                      -> use the URL param.
// And in every case, merely loading a `?lang=` URL must never overwrite the
// saved profile language (only the selector persists).
describe("SettingsManager initial load with ?lang= URL parameter", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["en-US"],
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  function navWithLang(lang: string) {
    return createNavigationManager({
      initialHref: `http://localhost:3000/?lang=${lang}`,
    });
  }

  // Case 1: the saved profile language wins over the URL param, and the URL
  // param is NOT written back to the profile (Kal's reported bug).
  it("lets a saved profile language override the URL param without overwriting the profile", async () => {
    const nav = navWithLang("de");
    const i18n = createI18nManager(nav, []);
    // Ensure i18n has settled on the URL language ("de") before the
    // profile-apply effect first runs, so the override is exercised
    // deterministically regardless of test order (i18next is a singleton).
    await i18n.ready;

    const login = makeFakeLogin(profileWithLang("en"));
    const settings = createSettings(CasualOSManager(), login, nav);
    i18n.setLanguagePersister(settings.persistLanguage);

    await settle();

    // Profile "en" wins over URL "de" ...
    expect(i18n.i18n.language).toBe("en");
    // ... and the saved language is untouched.
    expect(getProfileLang(login)).toBe("en");
  });

  // Case 1, async: the profile loads a moment after boot (real login flow).
  // Reproduces Kal's exact steps — the URL language shows first, then the
  // profile language replaces it, and the profile is never overwritten.
  it("does not overwrite the profile when the profile loads after a ?lang= boot", async () => {
    const nav = navWithLang("de");
    const i18n = createI18nManager(nav, []);
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, nav);
    i18n.setLanguagePersister(settings.persistLanguage);

    await i18n.ready;
    await settle();

    // Before login: the URL language is shown.
    expect(i18n.i18n.language).toBe("de");

    // Simulate login completing with a saved preference of "en".
    login.userId.value = "user-1";
    login.profile.value = profileWithLang("en");
    await settle();

    // Profile overrides the URL language ...
    expect(i18n.i18n.language).toBe("en");
    // ... and critically, the profile is still "en", not the URL's "de".
    expect(getProfileLang(login)).toBe("en");
  });

  // Case 2: signed in but no saved preference -> the URL param is used, and
  // is not persisted (no explicit selector choice was made).
  it("uses the URL param when a signed-in user has no saved language", async () => {
    const nav = navWithLang("de");
    const i18n = createI18nManager(nav, []);
    const login = makeFakeLogin({
      name: "Test",
      config: {},
    } as unknown as UserProfile);
    const settings = createSettings(CasualOSManager(), login, nav);
    i18n.setLanguagePersister(settings.persistLanguage);

    await i18n.ready;
    await settle();

    expect(i18n.i18n.language).toBe("de");
    expect(getProfileLang(login)).toBeUndefined();
  });

  // Case 3: not signed in -> the URL param is used.
  it("uses the URL param when the user is not signed in", async () => {
    const nav = navWithLang("de");
    const i18n = createI18nManager(nav, []);
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, nav);
    i18n.setLanguagePersister(settings.persistLanguage);

    await i18n.ready;
    await settle();

    expect(i18n.i18n.language).toBe("de");
  });
});

describe("fontSize / disablePanels (merged from ConfigManager)", () => {
  it("setFontSize updates the signal and persists to the profile when logged in", () => {
    const login = makeFakeLogin({
      name: "Test",
      config: {},
    } as unknown as UserProfile);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setFontSize("L");

    expect(settings.settings.value.fontSize).toBe("L");
    expect((login.profile.value as any)?.config?.fontSize).toBe("L");
  });

  it("setDisablePanels persists to login.localConfig when anonymous", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setDisablePanels(true);

    expect(settings.settings.value.disablePanels).toBe(true);
    expect(login.localConfig.value.disablePanels).toBe(true);
  });

  it("?settingsPreset=minimal drives only the fontSize/disablePanels defaults", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(
      CasualOSManager(),
      login,
      navWith("?settingsPreset=minimal")
    );

    expect(settings.settings.value.disablePanels).toBe(true);
    expect(settings.settings.value.fontSize).toBe("M");
    // Unrelated fields keep their own default, unaffected by the preset.
    expect(settings.settings.value.bookOrientation).toBe("traditional");
  });

  it("resetToDefaults resets fontSize and disablePanels along with everything else", () => {
    const login = makeFakeLogin({
      name: "Test",
      config: {},
    } as unknown as UserProfile);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setFontSize("XL");
    settings.setDisablePanels(true);
    settings.setBookOrientation("tanakh");
    settings.setThemeId("dark");
    settings.setDiscoverContentPanelInline(false);
    settings.setDiscoveredContent({ showContent: false });

    settings.resetToDefaults();

    expect(settings.settings.value.fontSize).toBe("M");
    expect(settings.settings.value.disablePanels).toBe(false);
    expect(settings.settings.value.bookOrientation).toBe("traditional");
    expect(settings.settings.value.themeId).toBe("system");
    expect(settings.settings.value.discoverContentPanelInline).toBe(true);
    expect(settings.settings.value.discoveredContent.showContent).toBe(true);
  });

  it("setDiscoverContentPanelInline persists to login.localConfig when anonymous and defaults to true", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, navWith());

    expect(settings.settings.value.discoverContentPanelInline).toBe(true);

    settings.setDiscoverContentPanelInline(false);

    expect(settings.settings.value.discoverContentPanelInline).toBe(false);
    expect(login.localConfig.value.discoverContentPanelInline).toBe(false);
  });

  it("setDiscoverContentPanelInline persists to the user's profile when logged in", () => {
    const login = makeFakeLogin({
      name: "Test",
      config: {},
    } as unknown as UserProfile);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setDiscoverContentPanelInline(false);

    expect(settings.settings.value.discoverContentPanelInline).toBe(false);
    expect(
      (login.profile.value as any)?.config?.discoverContentPanelInline
    ).toBe(false);
  });

  it("setDiscoveredContent persists to login.localConfig when anonymous and defaults to showing the content", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, navWith());

    expect(settings.settings.value.discoveredContent.showContent).toBe(true);

    settings.setDiscoveredContent({ showContent: false });

    expect(settings.settings.value.discoveredContent.showContent).toBe(false);
    expect(login.localConfig.value.discoveredContent).toEqual({
      showContent: false,
    });
  });

  it("setDiscoveredContent persists to the user's profile when logged in", () => {
    const login = makeFakeLogin({
      name: "Test",
      config: {},
    } as unknown as UserProfile);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setDiscoveredContent({ showContent: false });

    expect(settings.settings.value.discoveredContent.showContent).toBe(false);
    expect((login.profile.value as any)?.config?.discoveredContent).toEqual({
      showContent: false,
    });
  });

  it("setAllSettings accepts settings saved before discoveredContent existed and shows the content", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, navWith());
    const { discoveredContent: _omitted, ...legacySettings } =
      settings.settings.value;

    settings.setAllSettings(legacySettings as AppSettings);

    expect(settings.settings.value.discoveredContent).toEqual({
      showContent: true,
    });
  });

  it("setVerseSelectionEffects persists to login.localConfig when anonymous", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setVerseSelectionEffects("enabled");

    expect(settings.settings.value.verseSelectionEffects).toBe("enabled");
    expect(login.localConfig.value.verseSelectionEffects).toBe("enabled");
  });

  it("resetToDefaults resets verse selection effects to default", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setVerseSelectionEffects("disabled");
    settings.resetToDefaults();

    expect(settings.settings.value.verseSelectionEffects).toBe("default");
  });

  it("preserves verse selection effects after a simulated page refresh", () => {
    const os = CasualOSManager();
    const nav = navWith();

    const login1 = createLoginManager({ os });
    login1.hydrateLocalConfig();

    const settings1 = createSettings(os, login1, nav);
    settings1.setVerseSelectionEffects("enabled");

    // Simulate a fresh page load using the same localStorage.
    const login2 = createLoginManager({ os });
    login2.hydrateLocalConfig();

    const settings2 = createSettings(os, login2, nav);

    expect(settings2.settings.value.verseSelectionEffects).toBe("enabled");
  });
});

describe("unified anonymous fallback precedence (profile > URL > login.localConfig > default)", () => {
  const os = CasualOSManager();

  it("fontSize: profile wins over both the URL param and login.localConfig", () => {
    const login = makeFakeLogin({
      name: "Test",
      config: { fontSize: "S" },
    } as unknown as UserProfile);
    login.localConfig.value = { fontSize: "L" };

    const settings = createSettings(os, login, navWith("?app.fontSize=XL"));

    expect(settings.settings.value.fontSize).toBe("S");
  });

  it("fontSize: URL param wins over login.localConfig when anonymous", () => {
    const login = makeFakeLogin(null);
    login.localConfig.value = { fontSize: "L" };

    const settings = createSettings(os, login, navWith("?app.fontSize=XL"));

    expect(settings.settings.value.fontSize).toBe("XL");
  });

  it("fontSize: login.localConfig wins over the preset default", () => {
    const login = makeFakeLogin(null);
    login.localConfig.value = { fontSize: "L" };

    const settings = createSettings(os, login, navWith());

    expect(settings.settings.value.fontSize).toBe("L");
  });

  it("bookOrientation (an ex-SettingsManager field) follows the exact same precedence", () => {
    const loggedIn = makeFakeLogin({
      name: "Test",
      config: { bookOrientation: "tanakh" },
    } as unknown as UserProfile);
    loggedIn.localConfig.value = { bookOrientation: "traditional" };
    const profileWins = createSettings(
      os,
      loggedIn,
      navWith("?app.bookOrientation=traditional")
    );
    expect(profileWins.settings.value.bookOrientation).toBe("tanakh");

    const anon = makeFakeLogin(null);
    anon.localConfig.value = { bookOrientation: "traditional" };
    const urlWins = createSettings(
      os,
      anon,
      navWith("?app.bookOrientation=tanakh")
    );
    expect(urlWins.settings.value.bookOrientation).toBe("tanakh");

    const localWins = createSettings(os, anon, navWith());
    expect(localWins.settings.value.bookOrientation).toBe("traditional");
  });

  it("an anonymous user's edit sticks even when the URL carries a matching app.* param (does not revert)", () => {
    // Regression: readSettings() used to re-read `navigation.currentUrl`
    // fresh on every call, and the wrapping effect reacts to
    // `login.localConfig` (which every anonymous setter writes to) — so a
    // URL-provided starting value would immediately win again over the
    // user's own edit, in the same tick, since URL sat above `localConfig`
    // in the read precedence. The URL must only set the *starting* value.
    const login = makeFakeLogin(null);
    const settings = createSettings(os, login, navWith("?app.fontSize=XL"));

    expect(settings.settings.value.fontSize).toBe("XL");

    settings.setFontSize("L");

    expect(login.localConfig.value.fontSize).toBe("L");
    expect(settings.settings.value.fontSize).toBe("L");
  });

  it("applies to ex-SettingsManager fields too, not just fontSize/disablePanels", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(
      os,
      login,
      navWith("?app.bookOrientation=tanakh")
    );

    expect(settings.settings.value.bookOrientation).toBe("tanakh");

    settings.setBookOrientation("traditional");

    expect(login.localConfig.value.bookOrientation).toBe("traditional");
    expect(settings.settings.value.bookOrientation).toBe("traditional");
  });

  it("themeId (moved from ThemeManager) follows the exact same precedence", () => {
    const loggedIn = makeFakeLogin({
      name: "Test",
      config: { themeId: "dark" },
    } as unknown as UserProfile);
    const profileWins = createSettings(
      os,
      loggedIn,
      navWith("?app.themeId=light")
    );
    expect(profileWins.settings.value.themeId).toBe("dark");

    const anon = makeFakeLogin(null);
    anon.localConfig.value = { themeId: "dark" };
    const urlWins = createSettings(os, anon, navWith("?app.themeId=light"));
    expect(urlWins.settings.value.themeId).toBe("light");

    const localWins = createSettings(os, anon, navWith());
    expect(localWins.settings.value.themeId).toBe("dark");
  });

  it("lets an embed link's theme outrank a signed-in viewer's saved theme", () => {
    const loggedIn = makeFakeLogin({
      name: "Test",
      config: { themeId: "dark" },
    } as unknown as UserProfile);
    const settings = createSettings(
      os,
      loggedIn,
      navWith("?embed=minimal&app.themeId=light")
    );

    expect(settings.settings.value.themeId).toBe("light");
  });
});

describe("anonymous settings survive a simulated page refresh", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("a book orientation set anonymously is picked up by a fresh manager pair sharing the same localStorage", () => {
    const os = CasualOSManager();
    const nav = navWith();
    const login1 = createLoginManager({ os });
    const settings1 = createSettings(os, login1, nav);

    settings1.setBookOrientation("tanakh");

    // Simulate a fresh page load: a brand-new LoginManager/SettingsManager
    // pair, backed by the same (real) localStorage that `login1`'s anonymous
    // write just persisted to. `hydrateLocalConfig()` mirrors the real app's
    // post-mount effect (see `MainBody` in `app/main.tsx`) that applies the
    // device's real saved config — `localConfig` itself seeds empty to match
    // SSR.
    const login2 = createLoginManager({ os });
    login2.hydrateLocalConfig();
    const settings2 = createSettings(os, login2, nav);

    expect(settings2.settings.value.bookOrientation).toBe("tanakh");
  });
});

describe("custom highlight colors", () => {
  it("fills 3 slots then replaces the 1st, then the 2nd", () => {
    const settings = createSettings(
      CasualOSManager(),
      makeFakeLogin(null),
      navWith()
    );

    settings.addCustomHighlightColor("#111111");
    settings.addCustomHighlightColor("#222222");
    settings.addCustomHighlightColor("#333333");
    expect(settings.settings.value.customHighlightColors).toEqual([
      "#111111",
      "#222222",
      "#333333",
    ]);

    settings.addCustomHighlightColor("#444444");
    expect(settings.settings.value.customHighlightColors).toEqual([
      "#444444",
      "#222222",
      "#333333",
    ]);

    settings.addCustomHighlightColor("#555555");
    expect(settings.settings.value.customHighlightColors).toEqual([
      "#444444",
      "#555555",
      "#333333",
    ]);
  });

  it("ignores a color that is already in the selector", () => {
    const settings = createSettings(
      CasualOSManager(),
      makeFakeLogin(null),
      navWith()
    );

    settings.addCustomHighlightColor("#111111");
    settings.addCustomHighlightColor("#222222");
    settings.addCustomHighlightColor("#111111");

    expect(settings.settings.value.customHighlightColors).toEqual([
      "#111111",
      "#222222",
    ]);
  });
});

describe("scripture font override", () => {
  const ROBOTO = "Roboto, sans-serif";
  const OPEN_SANS = "Open Sans, sans-serif";
  const FONT_OVERRIDE_VAR = "--sb-scripture-font-override";

  const appliedFontOverride = () =>
    document.documentElement.style.getPropertyValue(FONT_OVERRIDE_VAR);

  const loggedInLogin = (config: Record<string, unknown> = {}) =>
    makeFakeLogin({ name: "Test", config } as unknown as UserProfile);

  const profileFontOverride = (login: LoginManager) =>
    (login.profile.value as { config?: { fontOverride?: string } } | null)
      ?.config?.fontOverride;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.style.removeProperty(FONT_OVERRIDE_VAR);
    localStorage.clear();
  });

  it("defaults to no override, leaving the theme fonts in charge", () => {
    const settings = createSettings(
      CasualOSManager(),
      makeFakeLogin(null),
      navWith()
    );

    expect(settings.settings.value.fontOverride).toBeUndefined();
    expect(appliedFontOverride()).toBe("");
  });

  it("persists a chosen font to the profile and publishes it as a CSS variable", () => {
    const login = loggedInLogin();
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setFontOverride(ROBOTO);

    expect(settings.settings.value.fontOverride).toBe(ROBOTO);
    expect(profileFontOverride(login)).toBe(ROBOTO);
    expect(appliedFontOverride()).toBe(ROBOTO);
  });

  it("persists a chosen font to login.localConfig when anonymous", () => {
    const login = makeFakeLogin(null);
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setFontOverride(ROBOTO);

    expect(login.localConfig.value.fontOverride).toBe(ROBOTO);
  });

  it("switching back to Default clears the saved font and the CSS variable", () => {
    const login = loggedInLogin({ fontOverride: ROBOTO });
    const settings = createSettings(CasualOSManager(), login, navWith());
    expect(appliedFontOverride()).toBe(ROBOTO);

    settings.setFontOverride(undefined);

    expect(settings.settings.value.fontOverride).toBeUndefined();
    expect(profileFontOverride(login)).not.toBe(ROBOTO);
    expect(appliedFontOverride()).toBe("");

    // A later session reading the same profile starts on Default too.
    const nextSession = createSettings(CasualOSManager(), login, navWith());
    expect(nextSession.settings.value.fontOverride).toBeUndefined();
  });

  it("switching back to Default sticks for a signed-in user whose device still has a font saved from before signing in", () => {
    const login = loggedInLogin();
    login.localConfig.value = { fontOverride: ROBOTO };
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setFontOverride(OPEN_SANS);
    settings.setFontOverride(undefined);

    expect(settings.settings.value.fontOverride).toBeUndefined();
    expect(appliedFontOverride()).toBe("");
    const nextSession = createSettings(CasualOSManager(), login, navWith());
    expect(nextSession.settings.value.fontOverride).toBeUndefined();
  });

  it("resetToDefaults sticks for a signed-in user whose device still has a font saved from before signing in", () => {
    const login = loggedInLogin({ fontOverride: OPEN_SANS });
    login.localConfig.value = { fontOverride: ROBOTO };
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.resetToDefaults();

    expect(settings.settings.value.fontOverride).toBeUndefined();
    expect(appliedFontOverride()).toBe("");
    const nextSession = createSettings(CasualOSManager(), login, navWith());
    expect(nextSession.settings.value.fontOverride).toBeUndefined();
  });

  it("ignores a saved font that is not one of the offered presets", () => {
    const settings = createSettings(
      CasualOSManager(),
      loggedInLogin({ fontOverride: "Comic Sans MS, cursive" }),
      navWith()
    );

    expect(settings.settings.value.fontOverride).toBeUndefined();
    expect(appliedFontOverride()).toBe("");
  });

  it("accepts a preset font from the app.fontOverride URL param", () => {
    const settings = createSettings(
      CasualOSManager(),
      makeFakeLogin(null),
      navWith(`?app.fontOverride=${encodeURIComponent(ROBOTO)}`)
    );

    expect(settings.settings.value.fontOverride).toBe(ROBOTO);
  });

  it("ignores an app.fontOverride URL param that is not one of the offered presets", () => {
    const settings = createSettings(
      CasualOSManager(),
      makeFakeLogin(null),
      navWith(`?app.fontOverride=${encodeURIComponent("url(evil), serif")}`)
    );

    expect(settings.settings.value.fontOverride).toBeUndefined();
    expect(appliedFontOverride()).toBe("");
  });

  it("resetToDefaults clears the font override", () => {
    const login = loggedInLogin();
    const settings = createSettings(CasualOSManager(), login, navWith());
    settings.setFontOverride(ROBOTO);

    settings.resetToDefaults();

    expect(settings.settings.value.fontOverride).toBeUndefined();
    expect(profileFontOverride(login)).not.toBe(ROBOTO);
    expect(appliedFontOverride()).toBe("");
  });

  it("an anonymous choice, and a later switch back to Default, both survive a page refresh", () => {
    const os = CasualOSManager();
    const nav = navWith();
    const refresh = () => {
      const login = createLoginManager({ os });
      login.hydrateLocalConfig();
      return createSettings(os, login, nav);
    };

    createSettings(os, createLoginManager({ os }), nav).setFontOverride(ROBOTO);
    const afterChoice = refresh();
    expect(afterChoice.settings.value.fontOverride).toBe(ROBOTO);

    afterChoice.setFontOverride(undefined);
    expect(refresh().settings.value.fontOverride).toBeUndefined();
  });
});

describe("removed per-section text settings", () => {
  const TEXT_STYLE_VARS = [
    "--text-bookTitle-font",
    "--text-heading-margin-top",
    "--text-verse-font-style",
    "--text-verse-text-decoration",
    "--text-verse-alignment",
    "--text-verse-line-height",
  ];
  const VERSE_COLOR_VAR = "--sb-verse-font-color";

  const appliedRootVar = (name: string) =>
    document.documentElement.style.getPropertyValue(name);

  const customizedTextConfig = {
    bookTitle: { font: "'Inter', sans-serif" },
    heading: { marginVertical: 40 },
    verse: {
      italic: true,
      underline: true,
      alignment: "center",
      color: "#aa0000",
      lineHeight: 2,
    },
  };

  const loggedInLogin = (config: Record<string, unknown> = {}) =>
    makeFakeLogin({ name: "Test", config } as unknown as UserProfile);

  const profileConfig = (login: LoginManager) =>
    (login.profile.value as { config?: Record<string, unknown> } | null)
      ?.config ?? {};

  afterEach(() => {
    for (const name of TEXT_STYLE_VARS) {
      document.documentElement.style.removeProperty(name);
    }
    document.body.style.removeProperty(VERSE_COLOR_VAR);
    localStorage.clear();
  });

  it("no longer applies text styles a signed-in user saved in All settings", () => {
    createSettings(
      CasualOSManager(),
      loggedInLogin({ textConfig: customizedTextConfig }),
      navWith()
    );

    expect(appliedRootVar("--text-verse-font-style")).toBe("");
    expect(appliedRootVar("--text-verse-text-decoration")).toBe("");
    expect(appliedRootVar("--text-verse-alignment")).toBe("");
    expect(appliedRootVar("--text-heading-margin-top")).toBe("");
    expect(appliedRootVar("--text-bookTitle-font")).toBe("");
    expect(document.body.style.getPropertyValue(VERSE_COLOR_VAR)).toBe("");
  });

  it("no longer applies text styles an anonymous visitor saved on the device", () => {
    const login = makeFakeLogin(null);
    login.localConfig.value = { textConfig: customizedTextConfig };

    createSettings(CasualOSManager(), login, navWith());

    expect(appliedRootVar("--text-verse-font-style")).toBe("");
    expect(appliedRootVar("--text-verse-text-decoration")).toBe("");
    expect(document.body.style.getPropertyValue(VERSE_COLOR_VAR)).toBe("");
  });

  it("keeps the verse line spacing saved alongside those old text styles", () => {
    const settings = createSettings(
      CasualOSManager(),
      loggedInLogin({ textConfig: customizedTextConfig }),
      navWith()
    );

    expect(settings.settings.value.verseLineHeight).toBe(2);
    expect(appliedRootVar("--text-verse-line-height")).toBe("2");
  });

  it("keeps a signed-in user's old line spacing over a newer one saved on the device while signed out", () => {
    const login = loggedInLogin({ textConfig: customizedTextConfig });
    login.localConfig.value = { verseLineHeight: 2.5 };

    const settings = createSettings(CasualOSManager(), login, navWith());

    expect(settings.settings.value.verseLineHeight).toBe(2);
    expect(appliedRootVar("--text-verse-line-height")).toBe("2");
  });

  it("reads the old line spacing from a link that passes the text styles as JSON", () => {
    const textConfigParam = encodeURIComponent(
      JSON.stringify({ verse: { lineHeight: 2 } })
    );
    const settings = createSettings(
      CasualOSManager(),
      makeFakeLogin(null),
      navWith(`?app.textConfig=${textConfigParam}`)
    );

    expect(settings.settings.value.verseLineHeight).toBe(2);
    expect(appliedRootVar("--text-verse-line-height")).toBe("2");
  });

  it("defaults the verse line spacing when nothing was saved", () => {
    const settings = createSettings(
      CasualOSManager(),
      makeFakeLogin(null),
      navWith()
    );

    expect(settings.settings.value.verseLineHeight).toBe(
      DEFAULT_VERSE_LINE_HEIGHT
    );
    expect(appliedRootVar("--text-verse-line-height")).toBe(
      String(DEFAULT_VERSE_LINE_HEIGHT)
    );
  });

  it("a new line spacing choice replaces the old saved one in later sessions", () => {
    const login = loggedInLogin({ textConfig: customizedTextConfig });
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.setVerseLineHeight(2.5);

    expect(profileConfig(login).verseLineHeight).toBe(2.5);
    expect(appliedRootVar("--text-verse-line-height")).toBe("2.5");
    const nextSession = createSettings(CasualOSManager(), login, navWith());
    expect(nextSession.settings.value.verseLineHeight).toBe(2.5);
  });

  it("resetToDefaults resets the line spacing even when an old one is saved", () => {
    const login = loggedInLogin({ textConfig: customizedTextConfig });
    const settings = createSettings(CasualOSManager(), login, navWith());

    settings.resetToDefaults();

    expect(settings.settings.value.verseLineHeight).toBe(
      DEFAULT_VERSE_LINE_HEIGHT
    );
    const nextSession = createSettings(CasualOSManager(), login, navWith());
    expect(nextSession.settings.value.verseLineHeight).toBe(
      DEFAULT_VERSE_LINE_HEIGHT
    );
  });

  it("an anonymous line spacing choice survives a page refresh", () => {
    const os = CasualOSManager();
    const nav = navWith();
    const refresh = () => {
      const login = createLoginManager({ os });
      login.hydrateLocalConfig();
      return createSettings(os, login, nav);
    };

    createSettings(os, createLoginManager({ os }), nav).setVerseLineHeight(2);

    expect(refresh().settings.value.verseLineHeight).toBe(2);
  });
});
