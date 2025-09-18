if(thisBot.masks.initialized || configBot.tags.systemPortal) return;

setTagMask(thisBot, "initialized", true);
if(typeof BibleLayout2DManager === "undefined")
{
    globalThis.BibleLayout2DManager = thisBot;
}