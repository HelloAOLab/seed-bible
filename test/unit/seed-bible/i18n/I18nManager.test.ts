import fs from "node:fs";
import path from "node:path";
import {
  createI18nManager,
  type I18nManager,
} from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
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
      syncSignalsToUrl: vi.fn(),
      go: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      updateQueryParam: vi.fn(),
      linkToQuery: vi.fn(),
      updateQueryParams: vi.fn(),
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

describe("I18nManager language fallback prompt", () => {
  let nav: NavigationManager;
  let manager: I18nManager;
  let currentUrl: Signal<URL>;

  beforeEach(() => {
    currentUrl = signal(new URL("https://example.com/"));
    nav = {
      currentUrl,
      initialUrl: currentUrl.peek(),
      syncSignalsToUrl: vi.fn(),
      go: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      updateQueryParam: vi.fn(),
      updateQueryParams: vi.fn(),
      linkToQuery: vi.fn(),
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

describe("I18nManager URL <-> language sync", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["en-US"],
    });
  });

  // Regression for #1443: the `?lang=` query param is the source of truth for
  // the UI language. When it changes on its own (deep link, browser
  // back/forward), the actual i18next translations must reload — not just the
  // `language` signal — otherwise `t()` keeps returning the old language.
  it("reloads i18n when ?lang= changes in the URL", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const manager = createI18nManager(nav, ["en"]);
    await manager.ready;
    expect(manager.i18n.language).toBe("en");

    window.history.pushState({}, "", "/?lang=de");

    const start = Date.now();
    while (manager.i18n.language !== "de" && Date.now() - start < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    expect(manager.i18n.language).toBe("de");
    expect(manager.language.value).toBe("de");
  });

  // Selecting a UI language writes `?lang=` to the URL (primary), and the
  // signal reflects the new language.
  it("writes ?lang= when the UI language is changed", async () => {
    const nav = createNavigationManager({ initialHref: window.location.href });
    const manager = createI18nManager(nav, ["en"]);
    await manager.ready;
    manager.setBibleTranslationApplicator(vi.fn(), () => null, null);

    await manager.requestLanguageChange("fr");

    expect(manager.language.value).toBe("fr");
    expect(nav.currentUrl.value.searchParams.get("lang")).toBe("fr");
  });
});
