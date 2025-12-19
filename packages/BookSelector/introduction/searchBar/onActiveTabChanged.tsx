const { tab } = that;

const thePage = getBot("system", "app.components");

const translationData = thePage.masks?.allTranslations.find(
  (translation) => translation.id === tab.data.translation
);

if (translationData) {
  setTagMask(thePage, "selectedTranslation", translationData, "local");
  whisper(thisBot, "initialize");
}
