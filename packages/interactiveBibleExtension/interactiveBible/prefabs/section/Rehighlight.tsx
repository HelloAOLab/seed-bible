/**
    * Reapplies the highlight effect to the section, including animations for opacity and scale.
    * @param {Object} [that] - An object containing parameters for the highlight.
    * @param {number} [that.speedMultiplier=1] - The multiplier for animation speed.
    * @returns {Promise<void>} - Resolves once the animations complete.
    * @throws {Error} - If there is a problem with the animations.
    * @example
    * section.Rehighlight();
*/

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
const dimension = os.getCurrentDimension();
const animationDuration = isInstantaneous ? 0 : StackAnimationsDuration.Rehighlight/speedMultiplier;
const deltaScaleZ = thisBot.tags.hoveredScaleZ - thisBot.tags.desiredScaleZ;
const infoLabelTransformer = getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(thisBot)));
const thisBotPosition = getBotPosition(thisBot, dimension);
const thisBotScales = GetBotScales(thisBot);
const animationEasing = {type: "sinusoidal", mode: "inout"};

setTagMask(thisBot, "isHighlighted", true);
setTagMask(thisBot, "isHighlighting", true);
await Promise.allSettled([
    animateTag(thisBot, {
        fromValue: {
            formOpacity: thisBot.tags.formOpacity,
            scaleX: thisBotScales.x,
            scaleY: thisBotScales.y
        },
        toValue: {
            formOpacity: thisBot.tags.hoveredOpacity,
            scaleX: thisBot.tags.hoveredScaleX,
            scaleY: thisBot.tags.hoveredScaleY
        },
        duration: animationDuration,
        easing: animationEasing
    }),
    infoLabelTransformer.Show({speedMultiplier, isInstantaneous})
])
setTagMask(thisBot, "isHighlighting", false);