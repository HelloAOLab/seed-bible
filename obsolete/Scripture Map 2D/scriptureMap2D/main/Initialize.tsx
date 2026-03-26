const bibleVizUtilsMain = getBot(byTag("system", "bibleVizUtils.main"));

if (
  thisBot.masks.initialized ||
  configBot.tags.systemPortal ||
  !bibleVizUtilsMain
)
  return;

setTagMask(thisBot, "initialized", true);
