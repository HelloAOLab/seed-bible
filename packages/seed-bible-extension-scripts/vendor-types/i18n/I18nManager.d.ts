import i18n from "i18next";
import type { TFunction } from "i18next";
import { type ComponentChildren } from "preact";
import type { NavigationManager } from "../managers/NavigationManager";
import { type TranslationWithLanguage } from "../managers/BibleReadingManager";
import type { Translation } from "../managers/FreeUseBibleAPI";
export { i18n };
export type BotTranslations = Record<string, Record<string, string>>;
/**
 * Adds the given translations to the i18n instance under the specified namespace.
 * @param ns The namespace for the translations, typically the extension ID to avoid conflicts with other extensions.
 * @param translations The translations to add, keyed by language code (e.g. "en", "es"), with each containing a "translation" object mapping translation keys to translated strings.
 * @param options The options for adding the translations.
 */
export declare function addTranslations(
  ns: string,
  translations: BotTranslations,
  options?: {
    overwrite?: boolean;
  }
): void;
export declare function getInitialLanguage(acceptedLanguages: string[]): string;
export declare function getUrlLanguage(url: URL): string | null;
/**
 * Shown when the UI language has no direct Bible text and we would switch the
 * reader to a nearest available translation (e.g. Gujarati → Hindi).
 */
export type LanguageFallbackPrompt = {
  requestedLanguage: string;
  fallbackLanguage: string;
  fallbackTranslation: TranslationWithLanguage;
};
export declare function createI18nManager(
  navigation: NavigationManager,
  acceptedLanguages: string[]
): {
  i18n: import("i18next").i18n;
  t: TFunction<["translation", ...string[]], undefined>;
  changeLanguage: (lng?: string) => Promise<TFunction>;
  requestLanguageChange: (nextLanguage: string) => Promise<void>;
  confirmLanguageFallback: () => Promise<void>;
  cancelLanguageFallback: () => void;
  setBibleTranslationApplicator: (
    applicator:
      | ((translation: TranslationWithLanguage) => Promise<void>)
      | null,
    getTranslations?: (() => readonly Translation[] | null) | null,
    loadTranslations?: (() => Promise<readonly Translation[] | null>) | null
  ) => void;
  setLanguagePersister: (
    persister: ((language: string) => void) | null
  ) => void;
  languageFallbackPrompt: import("@preact/signals").Signal<LanguageFallbackPrompt | null>;
  defaultLanguage: string;
  availableLanguages: string[];
  language: import("@preact/signals").Signal<string>;
  isRtl: import("@preact/signals").ReadonlySignal<boolean>;
  ready: Promise<unknown>;
};
export type I18nManager = ReturnType<typeof createI18nManager>;
export declare function I18nProvider(props: {
  i18n: I18nManager;
  children: ComponentChildren;
}): import("preact").JSX.Element;
export type I18nHook = ReturnType<typeof useI18n>;
/**
 * Gets the i18n manager, which provides access to the translation function, current language, available languages, and a function to change the language. Also provides a helper function for translating keys within a specific namespace.
 * @param ns The namespace for the translations, typically the extension ID to avoid conflicts with other extensions. This is optional, as the returned manager will still work without it, but it can be used to create a namespaced translation function that automatically applies the namespace to translation keys.
 * @returns
 */
export declare function useI18n(ns?: string): {
  t:
    | TFunction<["translation", ...string[]], undefined>
    | ((key: string, options?: Record<string, unknown>) => string);
  ns: string | undefined;
  language: string;
  isRtl: boolean;
  availableLanguages: string[];
  setLanguage: (language: string) => Promise<void>;
  requestLanguageChange: (nextLanguage: string) => Promise<void>;
  confirmLanguageFallback: () => Promise<void>;
  cancelLanguageFallback: () => void;
  languageFallbackPrompt: import("@preact/signals").Signal<LanguageFallbackPrompt | null>;
  i18n: import("i18next").i18n;
};
