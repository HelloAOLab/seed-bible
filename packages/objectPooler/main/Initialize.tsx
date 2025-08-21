/**
    * This tag is called when an instance is first loaded from @onEggHatch and/or from @onInstJoinded.
    * Here is made all the initial setup of the object pooler
    * @example
    * thisBot.initialize();
*/

if(thisBot.masks.initialized || ObjectPooler || configBot.tags.systemPortal) return;

globalThis.ObjectPooler = thisBot
setTagMask(thisBot, "initialized", true);
thisBot.vars.poolDictionary = {};