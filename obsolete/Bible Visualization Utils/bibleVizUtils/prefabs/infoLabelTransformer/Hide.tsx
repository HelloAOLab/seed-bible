/**
    * Animates and hides the info label and its tail by reducing their opacity to 0.
    * @param {Object} that - Optional parameters.
    * @param {number} [that.duration=0.15] - Duration of the hide animation.
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the speed of the animation.
    * @example
    * infoLabelTransformer.Hide({duration: 0.2, speedMultiplier: 1.5});
    */

let {duration = 0.15} = that ?? {};
const {speedMultiplier = 1, isInstantaneous = false} = that ?? {};
duration = isInstantaneous ? 0 : (duration / speedMultiplier);
thisBot.StopOpacityTransition();
const {infoLabel, infoLabelTail, infoLabelDate, infoLabelUsersColor} = thisBot.GetLabelElements();
setTagMask(thisBot, 'isHiding', true);
const easing = {type: "sinusoidal", mode: "inout"};
try
{
    await Promise.all([
        animateTag([...infoLabelUsersColor, infoLabelTail, infoLabel, infoLabelDate], "formOpacity", {
            toValue: 0,
            duration,
            easing
        }),
        animateTag(infoLabelUsersColor, "labelOpacity", {
            toValue: 0,
            duration,
            easing
        }),
        animateTag([infoLabel, infoLabelDate], "labelOpacity", {
            toValue: 0,
            duration,
            easing
        })
    ])
}
catch(error){console.error(error)}
finally
{
    setTagMask(thisBot, 'isHiding', false);
}