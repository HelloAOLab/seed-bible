import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
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
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
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
  // must change the interface language (`?lang=`), not only the scripture
  // translation (`?translation=`). The bug was that the manager re-applied
  // the profile's still-unsaved previous language whenever the URL changed —
  // and the language switch itself writes `?lang=` — so it reverted the switch.
  it("keeps a logged-in user's newly selected UI language (does not revert to the profile's previous language)", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const i18n = createI18nManager(nav, ["en"]);
    await i18n.ready;

    const login = makeFakeLogin(profileWithLang("en"));
    const settings = createSettings(CasualOSManager(), login, nav);
    // Selector-driven changes persist to the profile via this wiring (done by
    // SeedBibleState in production).
    i18n.setLanguagePersister(settings.persistLanguage);

    // The scripture-translation side-effect writes `?translation=`.
    const apply = vi.fn(async () => {
      nav.updateQueryParam("translation", "fra_onbv");
    });
    i18n.setBibleTranslationApplicator(
      apply,
      () => [{ id: "fra_onbv", language: "fra" } as Translation],
      null
    );

    await i18n.requestLanguageChange("fr");
    // Let any queued microtasks / async effects settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Primary effect: the UI language changed and is reflected in `?lang=`.
    expect(i18n.language.value).toBe("fr");
    expect(nav.currentUrl.value.searchParams.get("lang")).toBe("fr");
    // Secondary effect: the scripture translation changed too.
    expect(nav.currentUrl.value.searchParams.get("translation")).toBe(
      "fra_onbv"
    );
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

  // A shared `?lang=` link or browser back/forward changes the displayed
  // language, but must NOT overwrite the account's saved language — only the
  // in-app selector persists.
  it("does not persist a URL-driven language change to the profile", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const i18n = createI18nManager(nav, ["en"]);
    await i18n.ready;

    const login = makeFakeLogin(profileWithLang("en"));
    const settings = createSettings(CasualOSManager(), login, nav);
    i18n.setLanguagePersister(settings.persistLanguage);

    // Deep-link / back-forward navigation that puts ?lang=de in the URL.
    window.history.pushState({}, "", "/?lang=de");
    const start = Date.now();
    while (i18n.i18n.language !== "de" && Date.now() - start < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

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

    settings.resetToDefaults();

    expect(settings.settings.value.fontSize).toBe("M");
    expect(settings.settings.value.disablePanels).toBe(false);
    expect(settings.settings.value.bookOrientation).toBe("traditional");
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
    // write just persisted to.
    const login2 = createLoginManager({ os });
    const settings2 = createSettings(os, login2, nav);

    expect(settings2.settings.value.bookOrientation).toBe("tanakh");
  });
});
