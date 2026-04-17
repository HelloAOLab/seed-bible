// import { useMemo } from "https://esm.sh/preact@10.28.4/hooks";
import i18n from "https://esm.sh/i18next@23.16.8";
import {
  I18nextProvider,
  initReactI18next,
  useTranslation,
} from "https://esm.sh/react-i18next@15.1.2?alias=react:preact/compat,react-dom:preact/compat&external=preact";

const { useMemo } = os.appHooks;

export const DEFAULT_LANGUAGE = "en";

export { i18n };

export type BotTranslations = Record<string, Record<string, string>>;

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
    console.log(
      `[I18n] Adding translations for language "${lang}" and namespace "${ns}":`,
      resources
    );
    i18n.addResourceBundle(lang, ns, resources, true, options?.overwrite);
  }
}

/**
 * Loads translations from the given bot's tags.
 * Each tag with a key of 3 characters or less is considered a language code, and its value is expected to be a JSON string or an object containing the translations for that language.
 * @param bot The bot from which to load translations. Typically this would be the config bot or a dedicated locales bot.
 * @returns A record of translations keyed by language code, where each value is an object containing a "translation" object mapping translation keys to translated strings.
 */
function getTranslations(bot: Bot): BotTranslations {
  // os.log("Loading translations from bot tags...", localesBot);
  const loadedResources: BotTranslations = {};
  for (const langCode of Object.keys(bot.tags ?? {})) {
    if (langCode.length > 3) {
      continue; // Skip non-language tags
    }
    const translations = bot.tags[langCode];
    if (translations) {
      loadedResources[langCode] =
        typeof translations === "string"
          ? JSON.parse(translations)
          : translations;
    }
  }

  return loadedResources;
}

const seedBibleTranslations = getTranslations(thisBot);
if (!seedBibleTranslations[DEFAULT_LANGUAGE]) {
  seedBibleTranslations[DEFAULT_LANGUAGE] = {};
}

const availableLanguages = Object.keys(seedBibleTranslations).sort();

const initialLanguage = configBot.tags.lang || DEFAULT_LANGUAGE;

if (!i18n.isInitialized) {
  console.log(
    "[I18n] Initializing i18n with resources:",
    seedBibleTranslations,
    initialLanguage
  );
  i18n.use(initReactI18next).init({
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    initAsync: false,
    ns: ["seed-bible"],
  });

  addTranslations("seed-bible", seedBibleTranslations);
}

export function I18nProvider(props: { children: unknown }) {
  return <I18nextProvider i18n={i18n}>{props.children}</I18nextProvider>;
}

export type I18nManager = ReturnType<typeof useI18n>;

/**
 * Gets the i18n manager, which provides access to the translation function, current language, available languages, and a function to change the language. Also provides a helper function for translating keys within a specific namespace.
 * @param ns The namespace for the translations, typically the extension ID to avoid conflicts with other extensions. This is optional, as the returned manager will still work without it, but it can be used to create a namespaced translation function that automatically applies the namespace to translation keys.
 * @returns
 */
export function useI18n(ns?: string) {
  const { t, i18n: i18nInstance } = useTranslation();

  const setLanguage = async (language: string) => {
    await i18nInstance.changeLanguage(language);
  };

  const translate = ns
    ? (key: string, options?: Record<string, unknown>) =>
        t(key, { ...options, ns })
    : t;

  return useMemo(
    () => ({
      t: translate,
      ns,
      language: i18nInstance.language || DEFAULT_LANGUAGE,
      availableLanguages,
      setLanguage,
      i18n: i18nInstance,
    }),
    [t, i18nInstance.language]
  );
}
