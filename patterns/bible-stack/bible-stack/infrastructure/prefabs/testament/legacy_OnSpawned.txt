/**
 * Prepares the object when it is spawned from the pool by clearing animations, resetting tag masks, and applying modifications.
 * @param {Object} that - The context containing modification parameters.
 * @param {Object} that.mod - The modifications to apply to the bot upon spawning.
 * @example
 * testament.OnSpawned({mod: someModification})
 */

const { mod } = that;

clearAnimations(thisBot);
clearTagMasks(thisBot);
applyMod(thisBot, mod);
