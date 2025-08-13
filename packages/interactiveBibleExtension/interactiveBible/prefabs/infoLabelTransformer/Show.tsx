/**
    * Shows the info label and its tail by animating their opacities.
    * The duration of the animation can be adjusted by a speed multiplier.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {number} [that.duration=0.15] - Duration of the animation in seconds
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed
    * 
    * @example
    * infoLabelTransformer.Show({duration: 0.2, speedMultiplier: 1.5})
*/

let {duration = 0.15, speedMultiplier = 1, isInstantaneous = false} = that ?? {};
duration = isInstantaneous ? 0 : (duration/speedMultiplier);
thisBot.StopOpacityTransition();
const infoLabelUsersColor = await InstanceManager.UpdateUsersColorOnElement({element: thisBot});
const { infoLabel, infoLabelTail, infoLabelDate} = thisBot.GetLabelElements();
const easing = {type: "sinusoidal", mode: "inout"};
try
{
    await Promise.all([
        animateTag([...infoLabelUsersColor, infoLabelTail, infoLabel, infoLabelDate], "formOpacity", {
            toValue: thisBot.tags.targetOpacity,
            duration,
            easing
        }),
        animateTag(infoLabelUsersColor, {
            fromValue: {labelOpacity: 0},
            toValue: {labelOpacity: thisBot.tags.targetOpacity},
            duration,
            easing
        }),
        animateTag([infoLabel, infoLabelDate], "labelOpacity", {
            toValue: thisBot.tags.targetOpacity,
            duration,
            easing
        })
    ]).then(() => {
        setTagMask([infoLabel, infoLabelTail], "pointable", true);
    })
}
catch(error){console.error(error)}