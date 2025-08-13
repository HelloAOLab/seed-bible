if(thisBot.masks.initialized) return;
setTagMask(thisBot, "initialized", true);

if(typeof robotoFont === "undefined")
{
    globalThis.robotoFont = thisBot;
}