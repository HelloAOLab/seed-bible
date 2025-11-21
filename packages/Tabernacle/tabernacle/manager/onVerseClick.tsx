if (!thisBot.vars.appId) return;

const { book, chapter, verseNumber } = that;

const bookId = BibleVizUtils.Data.tags.booksStaticInfo[book].abbreviation;

const keys = thisBot.tags.scriptureData?.[bookId]?.[chapter]?.[verseNumber];

if (keys) {
  thisBot.HandleTabernacleSectionInteraction({ keys, type: "textClick" });
  globalThis.ToggleVerseHighlight(verseNumber, "#8df5f3", true, 1);
}
