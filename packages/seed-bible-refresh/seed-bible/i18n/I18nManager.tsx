import { useMemo } from "https://esm.sh/preact@10.28.4/hooks";
import i18n from "https://esm.sh/i18next@23.16.8";
import {
  I18nextProvider,
  initReactI18next,
  useTranslation,
} from "https://esm.sh/react-i18next@15.1.2?alias=react:preact/compat,react-dom:preact/compat";

const DEFAULT_LANGUAGE = "en";

function loadTranslations(): Record<
  string,
  { translation: Record<string, string> }
> {
  // os.log("Loading translations from bot tags...", localesBot);
  const loadedResources: Record<
    string,
    { translation: Record<string, string> }
  > = {};
  for (const langCode of Object.keys(thisBot.tags ?? {})) {
    if (langCode.length > 3) {
      continue; // Skip non-language tags
    }
    const translations = thisBot.tags[langCode];
    // os.log(`Loaded translations for ${langCode}:`, translations);
    if (translations) {
      loadedResources[langCode] = {
        translation:
          typeof translations === "string"
            ? JSON.parse(translations)
            : translations,
      };
    }
  }

  return loadedResources;
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    resources: loadTranslations(),
    interpolation: {
      escapeValue: false,
    },
  });
}

export function I18nProvider(props: { children: unknown }) {
  return <I18nextProvider i18n={i18n}>{props.children}</I18nextProvider>;
}

export function useI18n() {
  const { t, i18n: i18nInstance } = useTranslation();

  const setLanguage = async (language: string) => {
    await i18nInstance.changeLanguage(language);
  };

  return useMemo(
    () => ({
      t,
      language: i18nInstance.language || DEFAULT_LANGUAGE,
      setLanguage,
    }),
    [t, i18nInstance.language]
  );
}
