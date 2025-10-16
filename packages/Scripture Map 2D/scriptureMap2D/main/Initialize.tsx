if(thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);
if(typeof ScriptureMap2DManager === "undefined")
{
    globalThis.ScriptureMap2DManager = thisBot;
}

thisBot.StartReadingHistoryUpdate();