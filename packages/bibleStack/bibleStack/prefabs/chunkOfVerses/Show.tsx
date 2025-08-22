/**
    * Shows the chunk of verses, applying scale animation with a delay based on the index.
    * @param {Object} that - Contains parameters for the animation.
    * @param {number} that.index - The index of the chunk being shown.
    * @param {string} that.dimension - The dimension in which the chunk is being shown.
    * @param {number} that.delayBetweenAnimations - The delay between each chunk's animation.
    * @param {number} that.duration - The duration of the animation.
    * @example
    * chunkOfVerses.Show({index: 0, dimension: 'home', delayBetweenAnimations: 100, duration: 0.3});
*/

const {index, dimension ,delayBetweenAnimations, duration} = that;
const easing = {type: "elastic", mode: "out"};
const delay = index * delayBetweenAnimations;
await os.sleep(delay);
setTagMask(thisBot, dimension, true);
await animateTag(thisBot, 'scaleZ', {
    toValue: thisBot.tags.desiredScaleZ,
    duration,
    easing
})
return true;