/**
    * This tag is called when an instance is first loaded from @onEggHatch and/or from @onInstJoinded.
    * Here is made all the initial setup of the object pooler
    * @example
    * thisBot.initialize();
*/

if(thisBot.masks.initialized) return;

if(typeof ObjectPooler === "undefined")
{
    globalThis.ObjectPooler = thisBot;
}

setTagMask(thisBot, "initialized", true);
await os.sleep(1);
thisBot.CreateObjectPools();