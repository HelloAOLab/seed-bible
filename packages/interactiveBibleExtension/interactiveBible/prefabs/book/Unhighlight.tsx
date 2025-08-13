/**
    * Unhighlights the book and its associated info label, resetting their properties.
    * @param {object} [that] - Optional object that contains important data for the function.
    * @param {number} [customDuration] - Optional duration for the unhighlighting animation.
    * @param {number} [speedMultiplier=1] - Optional multiplier for the unhighlighting animation speed.
    * @returns {boolean} true - Indicates the operation completed successfully.
    * @throws {Error} - Throws an error if the animation fails.
    * @example
    * book.Unhighlight();
*/

const {customDuration, speedMultiplier = 1, isInstantaneous} = that ?? {};
// const bookData = StacksManager.GetBibleElementData({element: thisBot});
const dimension = os.getCurrentDimension();
const animationDuration = isInstantaneous ? 0 : ((customDuration ?? StackAnimationsDuration.Unhighlight)/speedMultiplier);
const infoLabelTransformer = GetCurrentInfoLabelTransformer(thisBot);
const scales = await thisBot.GetHighlightScales();
const animationEasing = {type: "sinusoidal", mode: "inout"};
const thisBotScales = GetBotScales(thisBot);

setTagMask(thisBot, "isUnhighlighting", true);
setTagMask(thisBot, "isHighlighted", false);

try
{
    await Promise.all([
        animateTag(thisBot, {
            fromValue: {
                formOpacity: thisBot.tags.formOpacity,
                scaleX: thisBotScales.x,
                scaleY: thisBotScales.y
            },
            toValue: {
                formOpacity: thisBot.tags.unhoveredOpacity,
                scaleX: scales.x,
                scaleY: scales.y
            },
            duration: animationDuration,
            easing: animationEasing
        }),
        infoLabelTransformer.Hide({duration: animationDuration})
    ]).then(() => {
        setTagMask(thisBot, "strokeColor", "clear");
        setTagMask(thisBot, "isHighlightDecreased", false);
        ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag});
        const activeElements = getBots(byTag("isBibleElement", true), byTag(dimension, true));
        if(activeElements.length > 0)
        {
            StacksManager.TrySetElementsRenderOrder(activeElements)
        }
    })
}
catch(error){ throw new Error(error) }
finally
{
    setTagMask(thisBot, "isUnhighlighting", false);
}

return true;