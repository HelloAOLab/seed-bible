import i18n from "i18next";
import { createContext, type ComponentChildren } from "preact";
import { useContext, useMemo } from "preact/hooks";
import { signal } from "@preact/signals";
import type {
  I18nManager,
  LanguageFallbackPrompt,
  UiLanguageSwitchPrompt,
} from "./I18nManager";

// `useI18n()` and what it needs, kept apart from `I18nManager.tsx` because
// shared components import it, and a sandboxed extension that uses one bundles
// everything it imports into its single file. `I18nManager.tsx` brings every
// locale with its language loader (6.4 MB), so only types come from there.

/** The parts of an {@link I18nManager} that `useI18n()` reads. */
export type I18nSource = Pick<
  I18nManager,
  | "i18n"
  | "language"
  | "availableLanguages"
  | "requestLanguageChange"
  | "confirmLanguageFallback"
  | "cancelLanguageFallback"
  | "languageFallbackPrompt"
  | "uiLanguageSwitchPrompt"
  | "confirmUiLanguageSwitch"
  | "dismissUiLanguageSwitch"
  | "neverAskUiLanguageSwitch"
>;

const I18nContext = createContext(null as I18nSource | null);

export function I18nProvider(props: {
  i18n: I18nSource;
  children: ComponentChildren;
}) {
  return (
    <I18nContext.Provider value={props.i18n}>
      {props.children}
    </I18nContext.Provider>
  );
}

let defaultI18n: I18nSource | null = null;

/**
 * Sets the translations `useI18n()` uses where no `I18nProvider` is above it,
 * such as an extension that renders into a root of its own. Only the browser
 * sets it: the server renders many visitors' pages in one process, each with
 * its own language, all inside a provider.
 */
export function setDefaultI18n(source: I18nSource | null) {
  defaultI18n = source;
}

let untranslatedI18n: I18nSource | null = null;

/**
 * The last resort when there is no provider and nothing set as the default,
 * as in a unit test: no strings at all, so each call shows its `defaultValue`,
 * or its key without one.
 */
function getUntranslatedI18n(): I18nSource {
  if (!untranslatedI18n) {
    // Its own instance: initializing the app's shared one here would stop
    // `createI18nManager` from setting it up with the language loader later.
    const instance = i18n.createInstance();
    void instance.init({
      lng: "en",
      ns: ["seed-bible"],
      initAsync: false,
      interpolation: { escapeValue: false },
      resources: {},
    });
    untranslatedI18n = {
      i18n: instance,
      language: signal("en"),
      availableLanguages: [],
      requestLanguageChange: async () => {},
      confirmLanguageFallback: async () => {},
      cancelLanguageFallback: () => {},
      languageFallbackPrompt: signal<LanguageFallbackPrompt | null>(null),
      uiLanguageSwitchPrompt: signal<UiLanguageSwitchPrompt | null>(null),
      confirmUiLanguageSwitch: async () => {},
      dismissUiLanguageSwitch: () => {},
      neverAskUiLanguageSwitch: () => {},
    };
  }
  return untranslatedI18n;
}

const RTL_LANGUAGE_CODES = new Set(["ar", "fa", "he", "ur", "ps", "dv", "yi"]);

export function isRightToLeftLanguage(languageCode: string): boolean {
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

export type I18nHook = ReturnType<typeof useI18n>;

/**
 * Gets the i18n manager, which provides access to the translation function, current language, available languages, and a function to change the language. Also provides a helper function for translating keys within a specific namespace.
 *
 * Works anywhere: it uses the nearest `I18nProvider`, then the one set with {@link setDefaultI18n} (the app's own, in the browser), then each call's `defaultValue`.
 * @param ns The namespace for the translations, typically the extension ID to avoid conflicts with other extensions. This is optional, as the returned manager will still work without it, but it can be used to create a namespaced translation function that automatically applies the namespace to translation keys.
 * @returns
 */
export function useI18n(ns?: string) {
  const i18nManager =
    useContext(I18nContext) ?? defaultI18n ?? getUntranslatedI18n();
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
      availableLanguages: i18nManager.availableLanguages,
      setLanguage,
      requestLanguageChange: i18nManager.requestLanguageChange,
      confirmLanguageFallback: i18nManager.confirmLanguageFallback,
      cancelLanguageFallback: i18nManager.cancelLanguageFallback,
      languageFallbackPrompt: i18nManager.languageFallbackPrompt,
      uiLanguageSwitchPrompt: i18nManager.uiLanguageSwitchPrompt,
      confirmUiLanguageSwitch: i18nManager.confirmUiLanguageSwitch,
      dismissUiLanguageSwitch: i18nManager.dismissUiLanguageSwitch,
      neverAskUiLanguageSwitch: i18nManager.neverAskUiLanguageSwitch,
      i18n: i18n,
    }),
    [t, i18n.language]
  );
}
