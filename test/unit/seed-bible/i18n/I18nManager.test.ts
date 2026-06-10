import fs from "node:fs";
import path from "node:path";

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

describe("I18nManager DEFAULT_LANGUAGE", () => {
  let originalLanguages: PropertyDescriptor | undefined;

  beforeAll(() => {
    originalLanguages = Object.getOwnPropertyDescriptor(
      window.navigator,
      "languages"
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  afterAll(() => {
    if (originalLanguages) {
      Object.defineProperty(window.navigator, "languages", originalLanguages);
    }
  });

  async function loadDefaultLanguageFor(languages: string[]) {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: languages,
    });

    const module =
      await import("@packages/seed-bible/seed-bible/i18n/I18nManager");
    return module.DEFAULT_LANGUAGE;
  }

  it.each(defaultLanguageCases)(
    "interprets %s as %s",
    async (locale, expectedLanguage) => {
      const language = await loadDefaultLanguageFor([locale]);

      expect(language).toBe(expectedLanguage);
    }
  );
});
