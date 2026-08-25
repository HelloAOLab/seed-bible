import {
  ARRANGEMENT_TRANSLATIONS,
  type ArrangementTranslationKey,
  type ArrangementTranslationLanguage,
} from "./ArrangementTranslations";

export class TranslationsConfigProvider {
  #lang: ArrangementTranslationLanguage;

  constructor(lang: ArrangementTranslationLanguage) {
    this.#lang = lang;
  }

  getArrangementTranslation<K extends ArrangementTranslationKey>(
    key: K
  ): (typeof ARRANGEMENT_TRANSLATIONS)[ArrangementTranslationLanguage][K] {
    return ARRANGEMENT_TRANSLATIONS[this.#lang][key];
  }
}
