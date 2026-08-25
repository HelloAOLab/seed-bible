import fs from "node:fs";
import path from "node:path";
import {
  createI18nManager,
  getPreferredSupportedLanguage,
  type I18nManager,
  type SettledTranslationSwitch,
  type TranslationSwitchPreference,
} from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { TranslationWithLanguage } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  createNavigationManager,
  type NavigationManager,
} from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { signal, type Signal } from "@preact/signals";

const i18nFolder = path.resolve(
  __dirname,
  "../../../../packages/seed-bible/seed-bible/i18n"
);

const supportedLanguages = fs
  .readdirSync(i18nFolder)
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

const defaultLanguageCases: Array<[string, string]> = [
  ["zh-CN", "zh"],
  ...supportedLanguages.map(
    (language) => [language, language] as [string, string]
  ),
];

describe("I18nManager getInitialLanguage()", () => {
  let ssrLanguages: string[] = [];
  let originalLanguages: PropertyDescriptor | undefined;
  let nav: NavigationManager;
  let manager: I18nManager;
  let currentUrl: Signal<URL>;

  beforeAll(() => {
    originalLanguages = Object.getOwnPropertyDescriptor(
      window.navigator,
      "languages"
    );
  });

  beforeEach(() => {
    ssrLanguages = [];
    currentUrl = signal(new URL("https://example.com/"));
    nav = {
      currentUrl,
      initialUrl: currentUrl.peek(),
      basePath: "",
      syncSignalsToUrl: vi.fn(),
      go: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      updateQueryParam: vi.fn(),
      linkToQuery: vi.fn(),
      updateQueryParams: vi.fn(),
      updatePathAndQueryParams: vi.fn(),
      dispose: vi.fn(),
    } as NavigationManager;
    manager = createI18nManager(nav, ssrLanguages);
  });

  afterAll(() => {
    if (originalLanguages) {
      Object.defineProperty(window.navigator, "languages", originalLanguages);
    }
  });

  function getDefaultLanguage() {
    manager = createI18nManager(nav, ssrLanguages);
    return manager.defaultLanguage;
  }

  function getDefaultLanguageFromNavigator(languages: string[]) {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: languages,
    });
    manager = createI18nManager(nav, ssrLanguages);
    return manager.defaultLanguage;
  }

  it.each(defaultLanguageCases)(
    "interprets %s as %s",
    (locale, expectedLanguage) => {
      const language = getDefaultLanguageFromNavigator([locale]);
      expect(language).toBe(expectedLanguage);
    }
  );

  it("uses the first accepted language when running in SSR", () => {
    try {
      import.meta.env.SSR = true;

      ssrLanguages = ["fr-FR", "es-ES"];
      const language = getDefaultLanguage();

      expect(language).toBe("fr");
    } finally {
      delete import.meta.env.SSR;
    }
  });

  it("prefers the `lang` URL query parameter when present", () => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["fr-FR"],
    });
    currentUrl.value = new URL("https://example.com/?lang=es");

    const language = getDefaultLanguage();

    expect(language).toBe("es");
  });

  it("uses the `lang` URL query parameter over the first accepted language when running in SSR", () => {
    try {
      import.meta.env.SSR = true;

      ssrLanguages = ["fr-FR", "es-ES"];
      currentUrl.value = new URL("https://example.com/?lang=es");
      const language = getDefaultLanguage();

      expect(language).toBe("es");
    } finally {
      delete import.meta.env.SSR;
    }
  });

  it("falls back to `en` when no language can be determined", () => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: [],
    });

    const language = getDefaultLanguage();

    expect(language).toBe("en");
  });
});

describe("getPreferredSupportedLanguage", () => {
  it("returns the first Accept-Language entry that matches a supported locale", () => {
    expect(getPreferredSupportedLanguage(["fr-FR", "es-ES"])).toBe("fr");
  });

  it("skips unsupported entries ahead of a supported one", () => {
    expect(getPreferredSupportedLanguage(["xx-XX", "de-DE", "fr-FR"])).toBe(
      "de"
    );
  });

  it("matches a language-only tag with no region subtag", () => {
    expect(getPreferredSupportedLanguage(["es"])).toBe("es");
  });

  it.each(supportedLanguages)("recognizes %s as supported", (language) => {
    expect(getPreferredSupportedLanguage([language])).toBe(language);
  });

  it("returns null when nothing in the list is supported", () => {
    expect(getPreferredSupportedLanguage(["xx-XX", "yy-YY"])).toBeNull();
  });

  it("returns null for an empty list (no Accept-Language header)", () => {
    expect(getPreferredSupportedLanguage([])).toBeNull();
  });
});

describe("I18nManager language fallback prompt", () => {
  let nav: NavigationManager;
  let manager: I18nManager;
  let currentUrl: Signal<URL>;

  beforeEach(() => {
    currentUrl = signal(new URL("https://example.com/"));
    nav = {
      currentUrl,
      initialUrl: currentUrl.peek(),
      basePath: "",
      syncSignalsToUrl: vi.fn(),
      go: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      updateQueryParam: vi.fn(),
      updateQueryParams: vi.fn(),
      updatePathAndQueryParams: vi.fn(),
      linkToQuery: vi.fn(),
      dispose: vi.fn(),
    } as NavigationManager;
    manager = createI18nManager(nav, ["en"]);
    manager.setBibleTranslationApplicator(vi.fn(), () => null, null);
  });

  it("shows the fallback prompt when the nearest translation is already active", async () => {
    await manager.requestLanguageChange("cy");

    expect(manager.languageFallbackPrompt.value).toEqual({
      requestedLanguage: "cy",
      fallbackLanguage: "en",
      fallbackTranslation: { id: "AAB", language: "eng" },
    });
  });

  it("does not show the fallback prompt when the UI language has a direct translation", async () => {
    const apply = vi.fn();
    manager.setBibleTranslationApplicator(
      apply,
      () => [{ id: "spa_onbv", language: "spa" } as Translation],
      null
    );

    await manager.requestLanguageChange("es");

    expect(manager.languageFallbackPrompt.value).toBeNull();
    expect(apply).toHaveBeenCalledWith({
      id: "spa_onbv",
      language: "spa",
    });
  });
});

describe("I18nManager translation switch prompt", () => {
  const SPA_COMPLETE = {
    id: "spa_onbv",
    name: "Open Nueva Biblia Viva",
    englishName: "Open Nueva Biblia Viva",
    language: "spa",
    languageEnglishName: "Spanish",
    numberOfBooks: 66,
  } as Translation;

  const FRA_COMPLETE = {
    id: "fra_onbv",
    name: "Ouverte Nouvelle Bible Vivante",
    englishName: "Open New Living Bible",
    language: "fra",
    languageEnglishName: "French",
    numberOfBooks: 66,
  } as Translation;

  const ENG_COMPLETE = {
    id: "AAB",
    name: "Accessible Ancients Bible",
    englishName: "Accessible Ancients Bible",
    language: "eng",
    languageEnglishName: "English",
    numberOfBooks: 66,
  } as Translation;

  /** A one-tab, English-text reader who hasn't settled the question yet. */
  function makeContext() {
    return {
      getVisibleTabCount: vi.fn((): number => 1),
      getSelectedTabBibleLanguage: vi.fn((): string | null => "eng"),
      getSwitchPreference: vi.fn((): TranslationSwitchPreference => "ask"),
      saveSwitchPreference: vi.fn(
        (_preference: SettledTranslationSwitch) => {}
      ),
      openTranslationPicker: vi.fn(),
    };
  }

  function makeApply() {
    return vi.fn((_translation: TranslationWithLanguage) => Promise.resolve());
  }

  let nav: NavigationManager;
  let manager: I18nManager;
  let apply: ReturnType<typeof makeApply>;
  let context: ReturnType<typeof makeContext>;

  /** Re-points the manager at a different catalog than the default Spanish one. */
  function withCatalog(...translations: Translation[]) {
    manager.setBibleTranslationApplicator(apply, () => translations, null);
  }

  beforeEach(() => {
    const currentUrl = signal(new URL("https://example.com/"));
    nav = {
      currentUrl,
      initialUrl: currentUrl.peek(),
      basePath: "",
      syncSignalsToUrl: vi.fn(),
      go: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      updateQueryParam: vi.fn(),
      updateQueryParams: vi.fn(),
      updatePathAndQueryParams: vi.fn(),
      linkToQuery: vi.fn(),
      dispose: vi.fn(),
    } as NavigationManager;
    manager = createI18nManager(nav, ["en"]);
    apply = makeApply();
    withCatalog(SPA_COMPLETE);
    context = makeContext();
    manager.setTranslationSwitchPromptContext(context);
  });

  it("asks instead of switching, and switches only once confirmed", async () => {
    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toEqual({
      language: "es",
      translation: { id: "spa_onbv", language: "spa" },
      translationName: "Open Nueva Biblia Viva",
      languageSearchTerm: "Spanish",
    });
    expect(apply).not.toHaveBeenCalled();

    await manager.confirmTranslationSwitch();

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).toHaveBeenCalledWith({ id: "spa_onbv", language: "spa" });
  });

  it("switches silently with no prompt context wired at all", async () => {
    manager.setTranslationSwitchPromptContext(null);

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).toHaveBeenCalledWith({ id: "spa_onbv", language: "spa" });
  });

  // Honoured whether or not anyone is signed in — the context resolves the
  // choice from the profile or the device store, and this layer doesn't care
  // which.
  it("switches silently for a user who settled on always", async () => {
    context.getSwitchPreference.mockReturnValue("always");

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).toHaveBeenCalledWith({ id: "spa_onbv", language: "spa" });
  });

  // The whole point of answering "No, keep reading" and stopping the
  // questions: neither a dialog nor a switch. Silence here must not be
  // mistaken for permission.
  it("leaves the text alone for a user who settled on never", async () => {
    context.getSwitchPreference.mockReturnValue("never");

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  // Turning "Ask before switching the Bible text" back on in Settings has to
  // actually bring the prompt back — including for a language that was
  // silently switched while the preference was settled, which must not have
  // been quietly recorded as already asked.
  it.each(["always", "never"] as const)(
    "asks again once %s is cleared",
    async (settled) => {
      context.getSwitchPreference.mockReturnValue(settled);

      await manager.requestLanguageChange("es");
      expect(manager.translationSwitchPrompt.value).toBeNull();

      context.getSwitchPreference.mockReturnValue("ask");
      await manager.requestLanguageChange("es");

      expect(manager.translationSwitchPrompt.value).toEqual(
        expect.objectContaining({ language: "es" })
      );
    }
  );

  // Asking to be asked again has to outrank "you already answered this one",
  // or every language settled earlier in the visit would stay silent.
  it("asks again about an already-answered language once reset", async () => {
    await manager.requestLanguageChange("es");
    manager.dismissTranslationSwitch();
    // Back to English, the way someone would be before opening Settings.
    await manager.requestLanguageChange("en");
    await manager.requestLanguageChange("es");
    expect(manager.translationSwitchPrompt.value).toBeNull();
    manager.dismissTranslationSwitch();
    await manager.requestLanguageChange("en");

    manager.resetTranslationSwitchPrompts();
    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toEqual(
      expect.objectContaining({ language: "es" })
    );
  });

  // The language on screen at the time is not somewhere the user is moving to,
  // so a reset must not turn it into a question of its own.
  it("keeps quiet about the language showing when it was reset", async () => {
    withCatalog(SPA_COMPLETE, ENG_COMPLETE);
    context.getSelectedTabBibleLanguage.mockReturnValue("hin");
    await manager.requestLanguageChange("es");
    manager.dismissTranslationSwitch();

    // Reset while Spanish is the current language, then come back to it.
    manager.resetTranslationSwitchPrompts();
    await manager.requestLanguageChange("en");
    expect(manager.translationSwitchPrompt.value).not.toBeNull();
    manager.dismissTranslationSwitch();
    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
  });

  // Opening the app in English is not a language *change*, so it never
  // prompts. Coming back to English later is therefore returning to where the
  // session started, not landing somewhere new.
  it("does not ask about the language the session started in", async () => {
    withCatalog(SPA_COMPLETE, ENG_COMPLETE);
    // A Hindi text under an English UI, so the tab-language gate can't be what
    // keeps this quiet — only the seeded starting language can.
    context.getSelectedTabBibleLanguage.mockReturnValue("hin");

    await manager.requestLanguageChange("en");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it("does not ask twice about the same language in one session", async () => {
    await manager.requestLanguageChange("es");
    expect(manager.translationSwitchPrompt.value).not.toBeNull();
    manager.dismissTranslationSwitch();

    // Back to English and then to Spanish again: already answered for Spanish.
    await manager.requestLanguageChange("en");
    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  // The per-session rule is per language, not one prompt for the whole visit:
  // a language the user hasn't landed on yet is a question they haven't been
  // asked, and staying silent there loses their text switch with no way to ask
  // for it.
  it("asks again for a language it has not offered yet this session", async () => {
    // French has to be genuinely promptable, or this would pass merely because
    // the catalog has no complete French text to offer.
    withCatalog(SPA_COMPLETE, FRA_COMPLETE);

    await manager.requestLanguageChange("es");
    expect(manager.translationSwitchPrompt.value?.language).toBe("es");
    manager.dismissTranslationSwitch();

    await manager.requestLanguageChange("fr");

    expect(manager.translationSwitchPrompt.value).toEqual(
      expect.objectContaining({
        language: "fr",
        translation: { id: "fra_onbv", language: "fra" },
      })
    );
    // Still nothing applied — the second prompt is an offer, not a switch.
    expect(apply).not.toHaveBeenCalled();
  });

  it("stops asking about a language once answered, but not about the others", async () => {
    withCatalog(SPA_COMPLETE, FRA_COMPLETE);

    await manager.requestLanguageChange("es");
    manager.dismissTranslationSwitch();
    await manager.requestLanguageChange("fr");
    manager.dismissTranslationSwitch();

    // Both have now been answered, so neither asks again.
    await manager.requestLanguageChange("es");
    expect(manager.translationSwitchPrompt.value).toBeNull();
    await manager.requestLanguageChange("fr");
    expect(manager.translationSwitchPrompt.value).toBeNull();
  });

  it("does not ask when a second tab is open", async () => {
    context.getVisibleTabCount.mockReturnValue(2);

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it("does not ask when the tab is already reading that language", async () => {
    context.getSelectedTabBibleLanguage.mockReturnValue("spa");

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  // `he` and `iw` are both Hebrew, so a Hebrew text is not "a different
  // language" from either of them.
  it("treats aliased locales as the same language as the tab's text", async () => {
    withCatalog({
      id: "heb_x",
      language: "heb",
      numberOfBooks: 66,
    } as Translation);
    context.getSelectedTabBibleLanguage.mockReturnValue("heb");

    await manager.requestLanguageChange("iw");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it("does not ask when the tab's text language can't be determined", async () => {
    context.getSelectedTabBibleLanguage.mockReturnValue(null);

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it("does not ask when only a partial translation exists for the language", async () => {
    withCatalog({ ...SPA_COMPLETE, numberOfBooks: 27 } as Translation);

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it("hands off to the translation picker without changing the text", async () => {
    await manager.requestLanguageChange("es");

    manager.chooseTranslationManually();

    expect(manager.translationSwitchPrompt.value).toBeNull();
    // The picker is told which language to filter to, so the user lands on
    // that language's options rather than the whole catalog.
    expect(context.openTranslationPicker).toHaveBeenCalledWith(
      expect.objectContaining({ languageSearchTerm: "Spanish" })
    );
    expect(apply).not.toHaveBeenCalled();
  });

  // The picker's search matches against catalog fields, so the term has to come
  // from the catalog. Falls back to the raw language code when the catalog
  // carries no name for it.
  it("falls back to the language code when the catalog has no language name", async () => {
    withCatalog({ ...SPA_COMPLETE, languageEnglishName: undefined });

    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchPrompt.value?.languageSearchTerm).toBe(
      "spa"
    );
  });

  it("dismisses without changing the text", async () => {
    await manager.requestLanguageChange("es");

    manager.dismissTranslationSwitch();

    expect(manager.translationSwitchPrompt.value).toBeNull();
    expect(context.openTranslationPicker).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  // The box is ticked when the prompt goes up, so answering at all settles the
  // question unless the user unticks it first.
  it("offers never-ask-again already ticked", async () => {
    await manager.requestLanguageChange("es");

    expect(manager.translationSwitchNeverAskAgain.value).toBe(true);
  });

  // Unticking is per prompt, not a standing choice: the next question starts
  // from the default again.
  it("re-ticks the box for the next prompt", async () => {
    withCatalog(SPA_COMPLETE, FRA_COMPLETE);
    await manager.requestLanguageChange("es");
    manager.translationSwitchNeverAskAgain.value = false;
    manager.dismissTranslationSwitch();

    await manager.requestLanguageChange("fr");

    expect(manager.translationSwitchNeverAskAgain.value).toBe(true);
  });

  // "Never ask again" means the opposite thing depending on the answer it is
  // given with. Taking the switch settles on switching from now on; keeping
  // the current text — or going off to pick one — settles on the text being
  // left alone, which is the only reading of "No, keep reading" that doesn't
  // contradict itself.
  it.each([
    ["confirm", (m: I18nManager) => m.confirmTranslationSwitch, "always"],
    [
      "choose another",
      (m: I18nManager) => m.chooseTranslationManually,
      "never",
    ],
    ["dismiss", (m: I18nManager) => m.dismissTranslationSwitch, "never"],
  ] as const)(
    "answering with %s settles on %s",
    async (_label, getAction, settled) => {
      await manager.requestLanguageChange("es");

      await getAction(manager)();

      expect(context.saveSwitchPreference).toHaveBeenCalledTimes(1);
      expect(context.saveSwitchPreference).toHaveBeenCalledWith(settled);
    }
  );

  it("saves nothing when the choice is unticked", async () => {
    await manager.requestLanguageChange("es");

    manager.translationSwitchNeverAskAgain.value = false;
    manager.dismissTranslationSwitch();

    expect(context.saveSwitchPreference).not.toHaveBeenCalled();
  });

  it("saves nothing when there was no prompt to answer", () => {
    manager.dismissTranslationSwitch();

    expect(context.saveSwitchPreference).not.toHaveBeenCalled();
  });
});

describe("I18nManager URL <-> language sync", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["en-US"],
    });
  });

  // URL <-> language sync (both directions) moved to TabsManager: the
  // language segment is part of the same coordinated reading path as
  // translation/book/chapter (e.g. "/es/spa_onbv/john/3"), so a single
  // writer owns the whole path instead of this manager independently
  // touching the URL. The equivalent coverage of the old regression (#1443:
  // an external `lang` change must reload i18next, not just the signal) now
  // lives in TabsManager.test.ts, alongside the write-side test.
  it("does not write to the URL directly when the UI language changes", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const manager = createI18nManager(nav, ["en"]);
    await manager.ready;
    manager.setBibleTranslationApplicator(vi.fn(), () => null, null);

    await manager.requestLanguageChange("fr");

    expect(manager.language.value).toBe("fr");
    expect(nav.currentUrl.value.search).toBe("");
    expect(nav.currentUrl.value.pathname).toBe("/");
  });
});
