if(thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);
if(typeof MapsManager === "undefined")
{
    globalThis.MapsManager = thisBot;
}

thisBot.vars.arrangementIndex = 0;
thisBot.vars.mapsData = [];
thisBot.vars.mapBooksStructure = [];
thisBot.vars.mapBooksData = [];
thisBot.vars.mapChaptersData = [];
setTagMask(thisBot, "isAnimatingMap", false);