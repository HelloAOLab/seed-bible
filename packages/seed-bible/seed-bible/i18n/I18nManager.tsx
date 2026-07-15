import i18n from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { useContext, useMemo } from "preact/hooks";
import en from "./en.json";
import { navigatorLanguages } from "../app/ssrEnv";
import { createContext, type ComponentChildren } from "preact";
import type { NavigationManager } from "../managers/NavigationManager";
import { computed, signal } from "@preact/signals";
import {
  getNearestBibleTranslationForUiLanguage,
  type TranslationWithLanguage,
} from "../managers/BibleReadingManager";
import type { Translation } from "../managers/FreeUseBibleAPI";

function getLanguageName(importPath: string): string {
  const match = importPath.match(/\.\/([a-z-]+)\.json$/i);
  if (match) {
    return match[1]!;
  }
  throw new Error(`Could not extract language code from path: ${importPath}`);
}

/**
 * Lazy per-language loaders keyed by import path (e.g. "./es.json"). Using a
 * non-eager glob means each locale becomes its own Vite chunk, fetched on
 * demand rather than bundled up front. The keys are available synchronously, so
 * we can still enumerate the supported languages without loading any file.
 */
const localeLoaders = import.meta.glob("./*.json") as Record<
  string,
  () => Promise<{ default: Record<string, string> }>
>;

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

const availableLanguages = Object.keys(localeLoaders)
  .map((path) => getLanguageName(path))
  .sort();

export function getInitialLanguage(acceptedLanguages: string[]): string {
  if (import.meta.env.SSR) {
    const ssrLang = getLanguage(acceptedLanguages[0]);
    if (ssrLang) {
      return ssrLang;
    }
  }

  return getLanguage(navigatorLanguages()[0]) ?? "en";
}

export function getUrlLanguage(url: URL): string | null {
  const urlLang = url.searchParams.get("lang");
  if (urlLang) {
    return urlLang;
  }
  return null;
}

/**
 * Shown when the UI language has no direct Bible text and we would switch the
 * reader to a nearest available translation (e.g. Gujarati → Hindi).
 */
export type LanguageFallbackPrompt = {
  requestedLanguage: string;
  fallbackLanguage: string;
  fallbackTranslation: TranslationWithLanguage;
};

export function createI18nManager(
  navigation: NavigationManager,
  acceptedLanguages: string[]
) {
  const initialLanguage = getInitialLanguage(acceptedLanguages);

  const url = navigation.currentUrl.value;

  // Computed at module load. During SSR `location`/`navigator` are absent, so
  // this falls back to "en"; the client re-derives the real language from the
  // URL/navigator at hydration.
  const defaultLanguage: string = getUrlLanguage(url) ?? initialLanguage;

  // Resolves once the detected language's translations are loaded. SSR and the
  // client entry await this before rendering so the first paint is in the right
  // language rather than the bundled "en" fallback.
  let ready: Promise<unknown>;

  if (!i18n.isInitialized) {
    // Fetch each (non-bundled) language's JSON chunk on demand. Only the
    // "seed-bible" namespace is file-backed; extension namespaces are supplied
    // directly via `addTranslations`/`addResourceBundle`.
    i18n.use(
      resourcesToBackend((language: string, namespace: string) => {
        if (namespace !== "seed-bible") {
          return Promise.reject(new Error(`Unknown namespace: ${namespace}`));
        }
        const loader = localeLoaders[`./${language}.json`];
        if (!loader) {
          return Promise.reject(
            new Error(`No locale file for language: ${language}`)
          );
        }
        return loader().then((mod) => mod.default);
      })
    );

    ready = i18n.init({
      lng: defaultLanguage,
      fallbackLng: "en",
      ns: ["seed-bible"],
      // Required so the backend is still consulted for languages beyond the
      // bundled resources below.
      partialBundledLanguages: true,
      interpolation: {
        escapeValue: false,
      },
      // English is bundled so a synchronous fallback is always present (notably
      // during SSR); every other language is fetched lazily by the backend.
      resources: { en: { "seed-bible": en } },
    });
  } else {
    ready = i18n.changeLanguage(defaultLanguage);
  }

  const language = signal(i18n.language);
  i18n.on("languageChanged", (lng) => {
    language.value = lng;
  });

  navigation.syncSignalsToUrl({
    lang: {
      get value() {
        if (language.value !== initialLanguage) {
          return language.value;
        }
        return null;
      },
      set value(newValue: string | null) {
        // Invoked when the URL's `?lang=` changes on its own — deep links and
        // browser back/forward. Route through `i18n.changeLanguage` so the
        // actual translations reload; the `languageChanged` listener above then
        // moves the `language` signal to match. Assigning the signal directly
        // here would desync `i18n.language` (and therefore every `t()` call)
        // from the URL.
        const next = newValue ?? defaultLanguage;
        if (next !== i18n.language) {
          void i18n.changeLanguage(next);
        }
      },
    },
  });

  const isRtl = computed(() => isRightToLeftLanguage(language.value));

  const languageFallbackPrompt = signal<LanguageFallbackPrompt | null>(null);

  /**
   * Wired by SeedBibleState so UI language changes also select the nearest
   * available Bible translation. Direct matches apply silently; fallback
   * suggestions (e.g. Gujarati → Hindi) show a warning modal first.
   */
  let applyBibleTranslation:
    | ((translation: TranslationWithLanguage) => Promise<void>)
    | null = null;
  let getAvailableTranslations: (() => readonly Translation[] | null) | null =
    null;
  let ensureTranslationsLoaded:
    | (() => Promise<readonly Translation[] | null>)
    | null = null;

  const setBibleTranslationApplicator = (
    applicator:
      | ((translation: TranslationWithLanguage) => Promise<void>)
      | null,
    getTranslations: (() => readonly Translation[] | null) | null = null,
    loadTranslations:
      | (() => Promise<readonly Translation[] | null>)
      | null = null
  ) => {
    applyBibleTranslation = applicator;
    getAvailableTranslations = getTranslations;
    ensureTranslationsLoaded = loadTranslations;
  };

  /**
   * Wired by SeedBibleState to persist the user's chosen UI language (e.g. to
   * their profile). Invoked ONLY for selector-driven changes via
   * `requestLanguageChange` — never for URL-driven changes (deep links,
   * browser back/forward) or profile-applied changes, so opening a shared
   * `?lang=` link updates the view without overwriting the account's saved
   * language.
   */
  let persistLanguage: ((language: string) => void) | null = null;
  const setLanguagePersister = (
    persister: ((language: string) => void) | null
  ) => {
    persistLanguage = persister;
  };

  const changeLanguage = i18n.changeLanguage.bind(i18n);

  const applyBibleTranslationForUiLanguage = async (uiLanguage: string) => {
    let available = getAvailableTranslations?.() ?? null;
    if (!available?.length && ensureTranslationsLoaded) {
      available = (await ensureTranslationsLoaded()) ?? null;
    }

    const nearest = getNearestBibleTranslationForUiLanguage(
      uiLanguage,
      available
    );

    // Direct support: apply silently. Nearest suggestion: ask first.
    if (nearest.usedFallback) {
      languageFallbackPrompt.value = {
        requestedLanguage: uiLanguage,
        fallbackLanguage: nearest.resolvedUiLanguage,
        fallbackTranslation: nearest.translation,
      };
      return;
    }

    languageFallbackPrompt.value = null;
    if (!applyBibleTranslation) {
      return;
    }
    await applyBibleTranslation(nearest.translation);
  };

  const requestLanguageChange = async (nextLanguage: string) => {
    if (nextLanguage !== language.value) {
      await changeLanguage(nextLanguage);
    }
    // Persist the user's explicit selection. Only selector-driven changes reach
    // this function; URL-driven changes go through the `syncSignalsToUrl`
    // setter above and are deliberately left un-persisted.
    persistLanguage?.(nextLanguage);
    await applyBibleTranslationForUiLanguage(nextLanguage);
  };

  const confirmLanguageFallback = async () => {
    const prompt = languageFallbackPrompt.value;
    if (!prompt) {
      return;
    }
    languageFallbackPrompt.value = null;
    await applyBibleTranslation?.(prompt.fallbackTranslation);
  };

  const cancelLanguageFallback = () => {
    languageFallbackPrompt.value = null;
  };

  return {
    i18n,
    t: i18n.t.bind(i18n),
    changeLanguage,
    requestLanguageChange,
    confirmLanguageFallback,
    cancelLanguageFallback,
    setBibleTranslationApplicator,
    setLanguagePersister,
    languageFallbackPrompt,
    defaultLanguage,
    availableLanguages,
    language,
    isRtl,
    ready,
  };
}

export type I18nManager = ReturnType<typeof createI18nManager>;
const I18nContext = createContext(null as I18nManager | null);

export function I18nProvider(props: {
  i18n: I18nManager;
  children: ComponentChildren;
}) {
  return (
    <I18nContext.Provider value={props.i18n}>
      {props.children}
    </I18nContext.Provider>
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
  const i18nManager = useContext(I18nContext);
  if (!i18nManager) {
    throw new Error("useI18n() must be used within an I18nProvider");
  }
  const i18n = i18nManager.i18n;
  const { t } = i18n;

  const isRtl = isRightToLeftLanguage(i18nManager.language.value);

  const setLanguage = async (language: string) => {
    await i18nManager.requestLanguageChange(language);
  };

  const translate = ns
    ? (key: string, options?: Record<string, unknown>) =>
        t(key, { ...options, ns })
    : t;

  return useMemo(
    () => ({
      t: translate,
      ns,
      language: i18nManager.language.value,
      isRtl,
      availableLanguages,
      setLanguage,
      requestLanguageChange: i18nManager.requestLanguageChange,
      confirmLanguageFallback: i18nManager.confirmLanguageFallback,
      cancelLanguageFallback: i18nManager.cancelLanguageFallback,
      languageFallbackPrompt: i18nManager.languageFallbackPrompt,
      i18n: i18n,
    }),
    [t, i18n.language]
  );
}
