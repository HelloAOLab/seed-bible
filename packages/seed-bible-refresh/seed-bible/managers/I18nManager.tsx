import { useMemo } from "https://esm.sh/preact@10.28.4/hooks";
import i18n from "https://esm.sh/i18next@23.16.8";
import {
  I18nextProvider,
  initReactI18next,
  useTranslation,
} from "https://esm.sh/react-i18next@15.1.2?alias=react:preact/compat,react-dom:preact/compat";

const DEFAULT_LANGUAGE = "en";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    resources: {
      en: {
        translation: {},
      },
    },
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
