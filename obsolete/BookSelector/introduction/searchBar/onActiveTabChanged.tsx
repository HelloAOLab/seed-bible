import type { TranslationInterface } from "introduction.searchBar.Interfaces";

const { tab } = that;

const thePage = getBot("system", "app.components");

const translationData = thePage.masks?.allTranslations.find(
  (translation: TranslationInterface) => translation.id === tab.data.translation
);

if (translationData) {
  setTagMask(thePage, "selectedTranslation", translationData, "local");
  whisper(thisBot, "initialize");
}
