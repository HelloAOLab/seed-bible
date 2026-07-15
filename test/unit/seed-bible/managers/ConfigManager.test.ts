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
