function I18nextProvider(props) {
  return props?.children ?? null;
}

const initReactI18next = {};

function useTranslation() {
  return {
    t: (key) => key,
    i18n: {
      language: "en",
      changeLanguage: async () => undefined,
    },
  };
}

module.exports = {
  I18nextProvider,
  initReactI18next,
  useTranslation,
};
