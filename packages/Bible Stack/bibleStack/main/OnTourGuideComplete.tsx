/**
 * Handles the completion of a tour guide by performing cleanup tasks and updating the state of the Bible interaction.
 * This function frees the portal, clears the current section making the tour guide, waits for 500 milliseconds, updates the stack of pieces, and resets relevant flags indicating the end of the Bible animation and section tour guide.
 *
 * @returns {Promise<void>} - This function is asynchronous and returns a promise that resolves when all actions are completed.
 *
 * @example
 * shout("OnTourGuideComplete");
 */

shout("MakePortalFree");
thisBot.vars.currentSectionMakingTourGuide = null;
await os.sleep(500);
await thisBot.UpdateStacks();
setTagMask(thisBot, "isBibleAnimating", false);
setTagMask(thisBot, "isASectionMakingTourGuide", false);
