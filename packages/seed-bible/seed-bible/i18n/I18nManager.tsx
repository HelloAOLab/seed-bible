import i18n from "i18next";
import { useContext, useMemo } from "preact/hooks";
import en from "./en.json";
import { navigatorLanguages } from "../app/ssrEnv";
import { createContext, type ComponentChildren } from "preact";
import { mapKeys } from "es-toolkit";
import type { NavigationManager } from "../managers/NavigationManager";

function getLanguageName(importPath: string): string {
  const match = importPath.match(/\.\/([a-z-]+)\.json$/i);
  if (match) {
    return match[1]!;
  }
  throw new Error(`Could not extract language code from path: ${importPath}`);
}

const importedLanguages = import.meta.glob("./*.json", { eager: true });
const languages = mapKeys(importedLanguages, (value, key) =>
  getLanguageName(key)
);

export { i18n };

export type BotTranslations = Record<string, Record<string, string>>;

function getLanguage(locale: string | null | undefined): string | null {
  if (!locale) {
    return null;
  }
  const normalized = locale.toLowerCase().replace(/_/g, "-");
  const [language] = normalized.split("-");
  return language || null;
}

/**
 * Adds the given translations to the i18n instance under the specified namespace.
 * @param ns The namespace for the translations, typically the extension ID to avoid conflicts with other extensions.
 * @param translations The translations to add, keyed by language code (e.g. "en", "es"), with each containing a "translation" object mapping translation keys to translated strings.
 * @param options The options for adding the translations.
 */
export function addTranslations(
  ns: string,
  translations: BotTranslations,
  options?: { overwrite?: boolean }
) {
  for (const [lang, resources] of Object.entries(translations)) {
    i18n.addResourceBundle(lang, ns, resources, true, options?.overwrite);
  }
}

// /**
//  * Loads translations from the given bot's tags.
//  * Each tag with a key of 3 characters or less is considered a language code, and its value is expected to be a JSON string or an object containing the translations for that language.
//  * @param bot The bot from which to load translations. Typically this would be the config bot or a dedicated locales bot.
//  * @returns A record of translations keyed by language code, where each value is an object containing a "translation" object mapping translation keys to translated strings.
//  */
// function getTranslations(bot: Bot): BotTranslations {
//   // os.log("Loading translations from bot tags...", localesBot);
//   const loadedResources: BotTranslations = {};
//   for (const langCode of Object.keys(bot.tags ?? {})) {
//     if (langCode.length > 3) {
//       continue; // Skip non-language tags
//     }
//     const translations = bot.tags[langCode];
//     if (translations) {
//       loadedResources[langCode] =
//         typeof translations === "string"
//           ? JSON.parse(translations)
//           : translations;
//     }
//   }

//   return loadedResources;
// }

const availableLanguages = Object.keys(languages).sort();
const I18nContext = createContext(i18n);

function getDefaultLanguage(url: URL, acceptedLanguages: string[]): string {
  const urlLang = url.searchParams.get("lang");
  if (urlLang) {
    return urlLang;
  }

  if (import.meta.env.SSR) {
    const ssrLang = getLanguage(acceptedLanguages[0]);
    if (ssrLang) {
      return ssrLang;
    }
  }

  return getLanguage(navigatorLanguages()[0]) ?? "en";
}

export function createI18nManager(
  navigation: NavigationManager,
  acceptedLanguages: string[]
) {
  const url = navigation.currentUrl.value;

  // Computed at module load. During SSR `location`/`navigator` are absent, so
  // this falls back to "en"; the client re-derives the real language from the
  // URL/navigator at hydration.
  const defaultLanguage: string = getDefaultLanguage(url, acceptedLanguages);

  console.log("[I18nManager] Detected default language:", defaultLanguage);

  if (!i18n.isInitialized) {
    i18n.init({
      lng: defaultLanguage,
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      initAsync: false,
      ns: ["seed-bible"],
    });

    i18n.addResourceBundle("en", "seed-bible", en, true);

    for (const [lang, resources] of Object.entries(languages)) {
      console.log("[I18nManager] Loading translations for language:", lang);
      if (typeof resources === "function") {
        (async () => {
          const json = await resources();
          i18n.addResourceBundle(lang, "seed-bible", json, true);
        })();
      } else {
        i18n.addResourceBundle(lang, "seed-bible", resources, true);
      }
    }
  } else {
    i18n.changeLanguage(defaultLanguage);
  }

  return {
    i18n,
    t: i18n.t.bind(i18n),
    changeLanguage: i18n.changeLanguage.bind(i18n),
    defaultLanguage,
    availableLanguages,
  };
}

export type I18nManager = ReturnType<typeof createI18nManager>;

export function I18nProvider(props: { children: ComponentChildren }) {
  return (
    <I18nContext.Provider value={i18n}>{props.children}</I18nContext.Provider>
  );
}

export type I18nHook = ReturnType<typeof useI18n>;

const RTL_LANGUAGE_CODES = new Set(["ar", "fa", "he", "ur", "ps", "dv", "yi"]);

function isRightToLeftLanguage(languageCode: string): boolean {
  const normalizedCode = languageCode.trim();
  if (!normalizedCode) {
    return false;
  }

  const primarySubtag = normalizedCode.split("-")[0]?.toLowerCase();
  if (primarySubtag && RTL_LANGUAGE_CODES.has(primarySubtag)) {
    return true;
  }

  if (typeof Intl !== "undefined" && typeof Intl.Locale === "function") {
    try {
      const locale = new Intl.Locale(normalizedCode) as Intl.Locale & {
        textInfo?: { direction: string };
        getTextInfo?: () => { direction: string };
      };
      if (typeof locale.getTextInfo === "function") {
        const textInfo = locale.getTextInfo();
        return textInfo.direction === "rtl";
      }
      return locale.textInfo?.direction === "rtl";
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Gets the i18n manager, which provides access to the translation function, current language, available languages, and a function to change the language. Also provides a helper function for translating keys within a specific namespace.
 * @param ns The namespace for the translations, typically the extension ID to avoid conflicts with other extensions. This is optional, as the returned manager will still work without it, but it can be used to create a namespaced translation function that automatically applies the namespace to translation keys.
 * @returns
 */
export function useI18n(ns?: string) {
  const i18n = useContext(I18nContext);
  const { t } = i18n;

  console.log("[useI18n] Current language:", i18n.language);

  const isRtl = isRightToLeftLanguage(i18n.language);

  const setLanguage = async (language: string) => {
    await i18n.changeLanguage(language);
  };

  const translate = ns
    ? (key: string, options?: Record<string, unknown>) =>
        t(key, { ...options, ns })
    : t;

  return useMemo(
    () => ({
      t: translate,
      ns,
      language: i18n.language,
      isRtl,
      availableLanguages,
      setLanguage,
      i18n: i18n,
    }),
    [t, i18n.language]
  );
}
