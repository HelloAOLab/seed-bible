import fs from "node:fs";
import path from "node:path";
import { getDefaultLanguage } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

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

describe("I18nManager getDefaultLanguage()", () => {
  let originalLanguages: PropertyDescriptor | undefined;

  beforeAll(() => {
    originalLanguages = Object.getOwnPropertyDescriptor(
      window.navigator,
      "languages"
    );
  });

  afterAll(() => {
    if (originalLanguages) {
      Object.defineProperty(window.navigator, "languages", originalLanguages);
    }
  });

  function getDefaultLanguageFor(languages: string[]) {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: languages,
    });

    return getDefaultLanguage(new URL("https://example.com/"), languages);
  }

  it.each(defaultLanguageCases)(
    "interprets %s as %s",
    (locale, expectedLanguage) => {
      const language = getDefaultLanguageFor([locale]);

      expect(language).toBe(expectedLanguage);
    }
  );

  it("uses the first accepted language when running in SSR", () => {
    try {
      import.meta.env.SSR = true;

      const language = getDefaultLanguage(new URL("https://example.com/"), [
        "fr-FR",
      ]);

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

    const language = getDefaultLanguage(
      new URL("https://example.com/?lang=es"),
      []
    );

    expect(language).toBe("es");
  });

  it("uses the `lang` URL query parameter over the first accepted language when running in SSR", () => {
    try {
      import.meta.env.SSR = true;

      const language = getDefaultLanguage(
        new URL("https://example.com/?lang=es"),
        ["fr-FR"]
      );

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

    const language = getDefaultLanguage(new URL("https://example.com/"), []);

    expect(language).toBe("en");
  });
});
