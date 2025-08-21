if(thisBot.masks.initialized || configBot.tags.systemPortal) return;

setTagMask(thisBot, "initialized", true);
if(typeof BibleLayout3DManager === "undefined")
{
    globalThis.BibleLayout3DManager = thisBot;
}

thisBot.vars.arrangementIndex = 0;
thisBot.vars.layoutsData = [];
thisBot.vars.layoutBooksStructure = [];
thisBot.vars.layoutBooksData = [];
thisBot.vars.layoutChaptersData = [];
setTagMask(thisBot, "isAnimatingBible", false);
setTimeout(() => {
    thisBot.UpdateLinks();
}, 100)