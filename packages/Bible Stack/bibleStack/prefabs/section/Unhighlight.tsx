/**
    * Reverses the highlight effect on the section by animating its opacity and scale back to the initial state.
    * The associated info label transformer is hidden and released back to the object pool.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {number} [that.customDuration] - Custom duration for the animation
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed
    * 
    * @returns {Promise<boolean>} - Resolves to true after the unhighlight animation completes
    * 
    * @example
    * section.Unhighlight({customDuration: 0.2, speedMultiplier: 1.5})
*/

const {customDuration, speedMultiplier = 1, isInstantaneous = false} = that ?? {};
// const dimension = os.getCurrentDimension();
const animationDuration = isInstantaneous ? 0 : ((customDuration ?? BibleVizUtils.Data.tags.StackAnimationsDuration.Unhighlight)/speedMultiplier);
const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot);
const thisBotScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const animationEasing = {type: "sinusoidal", mode: "inout"};

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
                scaleX: thisBot.tags.initialScaleX,
                scaleY: thisBot.tags.initialScaleY
            },
            duration: animationDuration,
            easing: animationEasing
        }),
        infoLabelTransformer.Hide({duration: animationDuration})
    ]).then(() => {
        ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag});
    });
}
catch(error){throw new Error(error)}
finally
{
    setTagMask(thisBot, "isUnhighlighting", false);
}

return true;