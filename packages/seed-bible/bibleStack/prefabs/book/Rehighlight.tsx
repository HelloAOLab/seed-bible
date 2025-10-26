/**
    * Reapplies the highlight effect to the book, including animations for opacity and scale.
    * @param {Object} [that] - An object containing parameters for the highlight.
    * @param {number} [that.speedMultiplier=1] - The multiplier for animation speed.
    * @returns {boolean} - Returns true if the highlight was reapplied successfully.
    * @example
    * book.Rehighlight();
*/

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
const bookData = BibleStackManager.GetPieceData({piece: thisBot});
// const dimension = os.getCurrentDimension();
const animationDuration = isInstantaneous ? 0 : BibleVizUtils.Data.tags.StackAnimationsDuration.Rehighlight/speedMultiplier;
const infoLabelTransformer = getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(thisBot)));
const thisBotScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const scales = await thisBot.GetHighlightScales();
const highlightAditionalScale = 0.1;
const animationEasing = {type: "sinusoidal", mode: "inout"};

setTagMask(thisBot, "isHighlighting", true);

try
{
    await Promise.all([
        animateTag(thisBot, {
            fromValue: {
                formOpacity: bookData.isSelected ? null : thisBot.tags.formOpacity,
                scaleX: thisBotScales.x,
                scaleY: thisBotScales.y
            },
            toValue: {
                formOpacity: bookData.isSelected ? null : thisBot.tags.hoveredOpacity,
                scaleX: scales.x + highlightAditionalScale,
                scaleY: scales.y + highlightAditionalScale
            },
            duration: animationDuration,
            easing: animationEasing
        }),
        infoLabelTransformer.Show({speedMultiplier, isInstantaneous, manager: BibleStackManager})
    ])
}
catch(error){console.error(error)}
finally
{
    setTagMask(thisBot, "isHighlighting", false);
}
