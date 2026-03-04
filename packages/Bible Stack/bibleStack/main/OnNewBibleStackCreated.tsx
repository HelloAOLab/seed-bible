/**
 * Deactivates the Bible creation process by setting the appropriate tag mask.
 *
 * @example
 * shout("OnNewBibleStackCreated");
 */

setTagMask(thisBot, "isBibleCreationActive", false);
if (!thisBot.vars.hasStackEverBeenSpawned)
  thisBot.PlaySound({ soundName: "BibleOpenSound" });
