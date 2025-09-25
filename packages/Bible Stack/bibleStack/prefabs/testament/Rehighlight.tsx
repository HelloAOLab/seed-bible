/**
    * Rehighlights the testament bot by scaling it and adjusting the label's opacity.
    * Handles reanimation of both the info label and its tail.
    * 
    * @param {object} [that] - Object containing important data for the function
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed
    * @returns {Promise<void>} - Resolves when the rehighlighting animation is complete
    * 
    * @example
    * testament.Rehighlight()
*/

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
// const dimension = os.getCurrentDimension();
const animationDuration = isInstantaneous ? 0 : (BibleVizUtils.Data.tags.StackAnimationsDuration.Rehighlight/speedMultiplier);
const infoLabelTransformer = getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(thisBot)));
const animationEasing = {type: "sinusoidal", mode: "inout"};
// const desiredLabelFormOpacity = 1;

setTagMask(thisBot, "isHighlighting", true);
setTagMask(thisBot, "isHighlighted", true);

await Promise.allSettled([
    animateTag(thisBot, {
        fromValue: {
            scaleX: thisBot.tags.scaleX,
            scaleY: thisBot.tags.scaleY
        },
        toValue: {
            scaleX: thisBot.tags.hoveredScaleX,
            scaleY: thisBot.tags.hoveredScaleY
        },
        duration: animationDuration,
        easing: animationEasing
    }),
    infoLabelTransformer.Show({speedMultiplier, isInstantaneous})
])

setTagMask(thisBot, "isHighlighting", false);