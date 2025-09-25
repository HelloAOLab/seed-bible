/**
    * Hides the verse bot by animating its scale in the Z-axis and updating its tag mask.
    * The animation is delayed based on the verse index to create a staggered effect.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {number} that.verseIndex - Index of the verse for calculating the delay
    * @param {string} that.dimension - The dimension tag to be updated after the animation
    * @param {number} that.delayBetweenAnimations - Delay time between verse animations
    * @param {number} that.duration - Duration of the scale animation
    * 
    * @example
    * verse.Hide({verseIndex: 2, dimension: 'home', delayBetweenAnimations: 100, duration: 0.5})
*/

const {verseIndex, dimension, delayBetweenAnimations, duration} = that;
const easing = {type: "elastic", mode: "in"};
const delay = verseIndex * delayBetweenAnimations;
await os.sleep(delay);
await animateTag(thisBot, 'scaleZ', {
    toValue: 0,
    duration,
    easing
})
setTagMask(thisBot, dimension, false);