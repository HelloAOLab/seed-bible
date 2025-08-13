/**
    * This tag is called when this bot is created
    * Here is made all the initial setup of the Stack manager
    * @example
    * thisBot.Initialize();
*/

const bots = getBots(
    byTag("dimension", "home_1"),
    byTag("homeX", 2),
    byTag("homeY", -3)
);

destroy(bots)

if(thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);
if(typeof StacksManager === "undefined")
{
    globalThis.StacksManager = thisBot;
}

setTagMask(thisBot, "areBibleElementsDraggable", thisBot.tags.areBibleElementsDraggable);
thisBot.vars.arrangementIndex = 0;
thisBot.vars.sectionNamesEverSelected = [];
thisBot.vars.biblesData = [];
thisBot.vars.testamentsData = [];
thisBot.vars.sectionsData = [];
thisBot.vars.sectionBooksData = [];
thisBot.vars.booksData = [];
thisBot.vars.chaptersData = [];
thisBot.vars.highlightedElements = [];
thisBot.vars.unhighlightDelaysInfo = [];
thisBot.vars.lastInteractedBookData = null;
thisBot.vars.lastInteractedSectionData = null;
thisBot.vars.lastInteractedTestamentData = null;
thisBot.vars.lastInteractedBibleData = null;
thisBot.masks.isBibleCreationActive = false;
thisBot.masks.hasStackEverBeenSpawned = false;
thisBot.masks.showBooksLabelDate = false;