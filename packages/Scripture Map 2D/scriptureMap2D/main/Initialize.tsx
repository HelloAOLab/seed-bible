if (
  thisBot.masks.initialized ||
  configBot.tags.systemPortal ||
  globalThis.ScriptureMap2DManager ||
  !globalThis.BibleVizUtils
)
  return;

setTagMask(thisBot, "initialized", true);
if (typeof ScriptureMap2DManager === "undefined") {
  globalThis.ScriptureMap2DManager = thisBot;
}

thisBot.StartReadingHistoryUpdate();
// thisBot.CreateFakeReadingHistoryData();
