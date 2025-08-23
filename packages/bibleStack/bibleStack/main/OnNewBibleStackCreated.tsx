/**
    * Deactivates the Bible creation process by setting the appropriate tag mask.
    *
    * @example
    * shout("OnNewBibleStackCreated");
*/

setTagMask(thisBot, 'isBibleCreationActive', false);
if(!thisBot.masks.hasStackEverBeenSpawned) thisBot.PlaySound({soundName: "BibleOpenSound"});