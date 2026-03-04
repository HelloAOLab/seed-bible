/**
 * Initializes the info label transformer, clears previous animations and tag masks, applies the given mod, and starts the shake animation if applicable.
 * @example
 * infoLabelTransformer.OnSpawned();
 */

const { mod } = that;

clearAnimations(thisBot);
clearTagMasks(thisBot);
applyMod(thisBot, mod);

if (thisBot.tags.isAnimatable) {
  thisBot.StartShakeAnimation();
}
