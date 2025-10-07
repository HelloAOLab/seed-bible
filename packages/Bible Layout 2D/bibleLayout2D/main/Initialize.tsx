if (thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);
if (typeof BibleLayout2DManager === "undefined") {
  globalThis.BibleLayout2DManager = thisBot;
}
