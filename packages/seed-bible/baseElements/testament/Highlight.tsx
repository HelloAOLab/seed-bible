/**
    * Highlights the testament bot by scaling it and displaying its info label transformer.
    * Adjusts the animation based on the provided speed multiplier.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed
    * @returns {Promise<void>} - Resolves when the highlighting animation and label showing are complete
    * 
    * @example
    * testament.Highlight({speedMultiplier: 1.5})
*/

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
const dimension = os.getCurrentDimension();
const thisBotScales = GetBotScales(thisBot);
const duration = isInstantaneous ? 0 : (StackAnimationsDuration.Highlight/speedMultiplier);
const easing = {type: "sinusoidal", mode: "inout"};
const label = thisBot.tags.infoLabel;
const testamentData = StacksManager.GetBibleElementData({element: thisBot})

const {infoLabelTransformer} = await StacksManager.GetLabelForElement({
    element: thisBot, 
    label,
    color: "white", 
    labelColor: testamentData.highlightColor ?? thisBot.tags.labelTextColor,
    dimension,
    labelPositioning: thisBot.masks.isOnTheGround ? LabelPositioning.Top : LabelPositioning.LeftSided,
    isAnimatable: true
});

setTagMask(thisBot, "isHighlighting", true);
setTagMask(thisBot, "isHighlighted", true);

try
{
    await Promise.all([
        animateTag(thisBot, {
            fromValue: {
                scaleX: thisBotScales.x,
                scaleY: thisBotScales.y
            },
            toValue: {
                scaleX: thisBot.tags.hoveredScaleX,
                scaleY: thisBot.tags.hoveredScaleY
            },
            duration,
            easing
        }),
        infoLabelTransformer.Show({speedMultiplier, isInstantaneous})
    ])
}
catch(error){console.error(error)}
finally
{
    setTagMask(thisBot, "isHighlighting", false);
}
