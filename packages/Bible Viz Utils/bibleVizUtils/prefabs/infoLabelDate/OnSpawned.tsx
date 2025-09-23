/**
    * Initializes the bot when it is spawned, clearing animations and tag masks, and applying a specified mod.
    * @param {Object} that - Object containing important data for the function.
    * @param {Object} that.mod - The modification to be applied to the cover.
    * @example
    * infoLabelDot.OnSpawned({ mod: someMod });
*/

const {mod} = that;

clearAnimations(thisBot);
clearTagMasks(thisBot);
applyMod(thisBot, mod);