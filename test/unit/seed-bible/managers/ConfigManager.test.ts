import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createConfig } from "@packages/seed-bible/seed-bible/managers/ConfigManager";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { signal } from "@preact/signals";

/**
 * Minimal LoginManager stand-in. `updateProfile` optimistically updates the
 * `profile` signal the same way the real manager does, which is what the
 * ConfigManager's profile-language effect subscribes to.
 */
function makeFakeLogin(initialProfile: UserProfile | null): LoginManager {
  const userId = signal<string | null>(initialProfile ? "user-1" : null);
  const profile = signal<UserProfile | null>(initialProfile);
  return {
    userId,
    profile,
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

describe("ConfigManager language handling", () => {
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
  // translation (`?translation=`). The bug was that ConfigManager re-applied
  // the profile's still-unsaved previous language whenever the URL changed —
  // and the language switch itself writes `?lang=` — so it reverted the switch.
  it("keeps a logged-in user's newly selected UI language (does not revert to the profile's previous language)", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const i18n = createI18nManager(nav, ["en"]);
    await i18n.ready;

    const login = makeFakeLogin(profileWithLang("en"));
    const config = createConfig(login, nav);
    // Selector-driven changes persist to the profile via this wiring (done by
    // SeedBibleState in production).
    i18n.setLanguagePersister(config.persistLanguage);

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
    createConfig(login, nav);

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
    const config = createConfig(login, nav);
    i18n.setLanguagePersister(config.persistLanguage);

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
    const config = createConfig(login, nav);
    i18n.setLanguagePersister(config.persistLanguage);
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
describe("ConfigManager initial load with ?lang= URL parameter", () => {
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
    const config = createConfig(login, nav);
    i18n.setLanguagePersister(config.persistLanguage);

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
    const config = createConfig(login, nav);
    i18n.setLanguagePersister(config.persistLanguage);

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
    const config = createConfig(login, nav);
    i18n.setLanguagePersister(config.persistLanguage);

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
    const config = createConfig(login, nav);
    i18n.setLanguagePersister(config.persistLanguage);

    await i18n.ready;
    await settle();

    expect(i18n.i18n.language).toBe("de");
  });
});
