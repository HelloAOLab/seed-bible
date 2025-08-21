/**
    * This tag is called when this bot is created
    * Here is made all the initial setup of the Stack manager
    * @example
    * thisBot.Initialize();
*/

if(thisBot.masks.initialized || configBot.tags.systemPortal) return;

setTagMask(thisBot, "initialized", true);
if(typeof BibleStackManager === "undefined")
{
    globalThis.BibleStackManager = thisBot;
}

setTagMask(thisBot, "areBiblePiecesDraggable", thisBot.tags.areBiblePiecesDraggable);

thisBot.vars.sectionNamesEverSelected = [];
thisBot.vars.stackBiblesData = [];
thisBot.vars.stackTestamentsData = [];
thisBot.vars.stackSectionsData = [];
thisBot.vars.stackSectionBooksData = [];
thisBot.vars.stackBooksData = [];
thisBot.vars.stackChaptersData = [];
thisBot.vars.highlightedPieces = [];
thisBot.vars.unhighlightDelaysInfo = [];
thisBot.vars.lastInteractedStackBookData = null;
thisBot.vars.lastInteractedStackSectionData = null;
thisBot.vars.lastInteractedStackTestamentData = null;
thisBot.vars.lastInteractedStackBibleData = null;
thisBot.masks.isBibleCreationActive = false;
thisBot.masks.hasStackEverBeenSpawned = false;
thisBot.masks.showBooksLabelDate = false;