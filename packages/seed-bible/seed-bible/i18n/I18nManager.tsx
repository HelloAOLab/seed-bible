import i18n from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { useContext, useMemo } from "preact/hooks";
import en from "./en.json";
import { navigatorLanguages } from "../app/ssrEnv";
import { createContext, type ComponentChildren } from "preact";
import type { NavigationManager } from "../managers/NavigationManager";
import { computed, signal } from "@preact/signals";
import {
  findCompleteTranslationForUiLanguage,
  getNearestBibleTranslationForUiLanguage,
  isTranslationInUiLanguage,
  type TranslationWithLanguage,
} from "../managers/BibleReadingManager";
import type { Translation } from "../managers/FreeUseBibleAPI";
import { translationLanguageLabel } from "../managers/translationGrouping";
import {
  DEFAULT_UI_LANGUAGE,
  parseReadingPath,
} from "../managers/ReadingUrlPath";

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

  return getLanguage(navigatorLanguages()[0]) ?? DEFAULT_UI_LANGUAGE;
}

/**
 * Picks the visitor's most-preferred UI language, out of an `Accept-Language`
 * header's ordered list of tags, that this app actually ships a locale for.
 * Returns null when none of the visitor's preferences match a supported
 * language — the caller should keep whatever it already had rather than
 * guess.
 */
export function getPreferredSupportedLanguage(
  acceptedLanguages: string[]
): string | null {
  for (const tag of acceptedLanguages) {
    const language = getLanguage(tag);
    if (language && availableLanguages.includes(language)) {
      return language;
    }
  }
  return null;
}

/**
 * Resolves the UI language a URL implies. A valid reading path (e.g.
 * "/es/spa_onbv/john/3") takes priority: an explicit `{lang}` segment wins,
 * and an omitted one canonically means `DEFAULT_UI_LANGUAGE` — that's the
 * meaning of the 3-segment "fully default" form, not "detect from the
 * browser" (browser-based detection only applies to a bare `/` with no
 * reading path at all, via `getInitialLanguage`). Falls back to the legacy
 * `?lang=` query param for a non-reading-path URL.
 */
export function getUrlLanguage(url: URL, basePath: string): string | null {
  const parsed = parseReadingPath(url.pathname, basePath);
  if (parsed) {
    return parsed.language ?? DEFAULT_UI_LANGUAGE;
  }

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

/**
 * Shown when a UI language change *could* also switch the reader's Bible text
 * to a complete translation in that language. The complement of
 * {@link LanguageFallbackPrompt}: this is the direct-match case, where the
 * chosen language really is supported and the only question is whether the
 * user wants their scripture to follow their menus.
 */
export type TranslationSwitchPrompt = {
  language: string;
  translation: TranslationWithLanguage;
  translationName: string;
  languageSearchTerm: string;
};

/**
 * The reader-side facts `applyBibleTranslationForUiLanguage` needs to decide
 * whether asking is appropriate, plus the two side effects it can't perform
 * itself. Injected by `SeedBibleState` (see
 * `setTranslationSwitchPromptContext`) because tabs, login, and the selector
 * are all built *after* this manager.
 *
 * While this is unset — unit tests, embedders — a UI language change keeps
 * silently applying the nearest translation, the behavior that predates the
 * prompt.
 */
export type TranslationSwitchPromptContext = {
  getVisibleTabCount: () => number;
  getSelectedTabBibleLanguage: () => string | null;
  getSwitchPreference: () => TranslationSwitchPreference;
  saveSwitchPreference: (preference: SettledTranslationSwitch) => void;
  openTranslationPicker: (prompt: TranslationSwitchPrompt) => void;
};

/**
 * What "never ask again" settled on, which depends on the answer it was given
 * with. Saying yes to the switch and then stopping the questions means "just
 * switch it from now on"; saying no means the opposite, and the user's text
 * must be left alone. One flag can't carry both, so the preference records
 * which.
 */
export type SettledTranslationSwitch = "always" | "never";

/** `"ask"` — the default — is the un-settled state that raises the prompt. */
export type TranslationSwitchPreference = SettledTranslationSwitch | "ask";

export function createI18nManager(
  navigation: NavigationManager,
  acceptedLanguages: string[]
) {
  const initialLanguage = getInitialLanguage(acceptedLanguages);

  const url = navigation.currentUrl.value;

  // Computed at module load. During SSR `location`/`navigator` are absent, so
  // this falls back to "en"; the client re-derives the real language from the
  // URL/navigator at hydration.
  const defaultLanguage: string =
    getUrlLanguage(url, navigation.basePath) ?? initialLanguage;

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
      fallbackLng: DEFAULT_UI_LANGUAGE,
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

  // URL <-> language sync (both directions) is owned by `TabsManager`, not
  // here: the language segment is part of the same coordinated reading path
  // as translation/book/chapter (e.g. "/es/spa_onbv/john/3"), so a single
  // writer needs to own the whole path instead of this manager independently
  // touching the URL. `TabsManager.syncSelectedTabFromUrl` calls
  // `changeLanguage` directly when an external URL change implies a
  // different language; the `commitSelectedTabToUrl` effect there writes the
  // language segment back out.

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

  const translationSwitchPrompt = signal<TranslationSwitchPrompt | null>(null);

  /**
   * Whether the open prompt's "never ask again" box is ticked. Starts ticked,
   * and is re-ticked each time a prompt goes up: answering the question once is
   * taken as settling it, and Settings offers a way back.
   *
   * Kept here rather than inside the dialog so that every way out of it honours
   * what the box says — including the host's close button and a click on the
   * backdrop, which never reach the dialog's own buttons.
   */
  const translationSwitchNeverAskAgain = signal(true);

  let translationSwitchContext: TranslationSwitchPromptContext | null = null;
  const setTranslationSwitchPromptContext = (
    context: TranslationSwitchPromptContext | null
  ) => {
    translationSwitchContext = context;
  };

  const promptedLanguages = new Set<string>([defaultLanguage]);

  /**
   * Forgets which languages have already been asked about, so every one of
   * them can raise the prompt again. Turning asking back on is a request to be
   * asked, and that has to outrank "you have answered this before" — otherwise
   * the languages the user had already settled would stay silent forever.
   *
   * The language currently on screen is kept on the list: the user is reading
   * in it rather than moving to it, so there is nothing to offer.
   */
  const resetTranslationSwitchPrompts = () => {
    promptedLanguages.clear();
    promptedLanguages.add(language.peek());
  };

  const changeLanguage = i18n.changeLanguage.bind(i18n);

  /**
   * The prompt to put in front of the user for a language they've just chosen,
   * or null when asking isn't appropriate. Every null is a reason to leave the
   * reader's text exactly as it is — never a reason to switch it silently.
   */
  const buildTranslationSwitchPrompt = (
    context: TranslationSwitchPromptContext,
    uiLanguage: string,
    available: readonly Translation[] | null
  ): TranslationSwitchPrompt | null => {
    if (promptedLanguages.has(uiLanguage)) {
      return null;
    }

    if (context.getVisibleTabCount() !== 1) {
      return null;
    }

    const tabLanguage = context.getSelectedTabBibleLanguage();
    if (!tabLanguage || isTranslationInUiLanguage(uiLanguage, tabLanguage)) {
      return null;
    }

    const complete = findCompleteTranslationForUiLanguage(
      uiLanguage,
      available
    );
    if (!complete) {
      return null;
    }

    return {
      language: uiLanguage,
      translation: { id: complete.id, language: complete.language },
      translationName: complete.name || complete.englishName || complete.id,
      languageSearchTerm: translationLanguageLabel(complete),
    };
  };

  const applyBibleTranslationForUiLanguage = async (uiLanguage: string) => {
    let available = getAvailableTranslations?.() ?? null;
    if (!available?.length && ensureTranslationsLoaded) {
      available = (await ensureTranslationsLoaded()) ?? null;
    }

    const nearest = getNearestBibleTranslationForUiLanguage(
      uiLanguage,
      available
    );

    if (nearest.usedFallback) {
      languageFallbackPrompt.value = {
        requestedLanguage: uiLanguage,
        fallbackLanguage: nearest.resolvedUiLanguage,
        fallbackTranslation: nearest.translation,
      };
      return;
    }

    languageFallbackPrompt.value = null;

    const context = translationSwitchContext;
    if (!context) {
      await applyBibleTranslation?.(nearest.translation);
      return;
    }
    const preference = context.getSwitchPreference();
    if (preference === "always") {
      await applyBibleTranslation?.(nearest.translation);
      return;
    }
    if (preference === "never") {
      return;
    }

    const prompt = buildTranslationSwitchPrompt(context, uiLanguage, available);
    if (!prompt) {
      return;
    }

    promptedLanguages.add(prompt.language);
    translationSwitchNeverAskAgain.value = true;
    translationSwitchPrompt.value = prompt;
  };

  /**
   * Answers the open prompt and hands back its payload. `settles` is what
   * "never ask again" should mean for the answer being given — taking the
   * switch settles on switching from now on, while keeping the current text
   * settles on leaving it alone.
   */
  const answerTranslationSwitchPrompt = (
    settles: SettledTranslationSwitch
  ): TranslationSwitchPrompt | null => {
    const prompt = translationSwitchPrompt.value;
    if (!prompt) {
      return null;
    }
    if (translationSwitchNeverAskAgain.peek()) {
      translationSwitchContext?.saveSwitchPreference(settles);
    }
    translationSwitchPrompt.value = null;
    return prompt;
  };

  const confirmTranslationSwitch = async () => {
    const prompt = answerTranslationSwitchPrompt("always");
    if (!prompt) {
      return;
    }
    await applyBibleTranslation?.(prompt.translation);
  };

  const chooseTranslationManually = () => {
    const prompt = answerTranslationSwitchPrompt("never");
    if (!prompt) {
      return;
    }
    translationSwitchContext?.openTranslationPicker(prompt);
  };

  const dismissTranslationSwitch = () => {
    answerTranslationSwitchPrompt("never");
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
    setTranslationSwitchPromptContext,
    resetTranslationSwitchPrompts,
    languageFallbackPrompt,
    translationSwitchPrompt,
    translationSwitchNeverAskAgain,
    confirmTranslationSwitch,
    chooseTranslationManually,
    dismissTranslationSwitch,
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
      translationSwitchPrompt: i18nManager.translationSwitchPrompt,
      translationSwitchNeverAskAgain:
        i18nManager.translationSwitchNeverAskAgain,
      confirmTranslationSwitch: i18nManager.confirmTranslationSwitch,
      chooseTranslationManually: i18nManager.chooseTranslationManually,
      dismissTranslationSwitch: i18nManager.dismissTranslationSwitch,
      i18n: i18n,
    }),
    [t, i18n.language]
  );
}
