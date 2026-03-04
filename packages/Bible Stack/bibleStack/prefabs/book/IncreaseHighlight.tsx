/**
    * Increases the highlight of the book by changing its opacity and starting a shake animation on the info label.
    * @example
    * book.IncreaseHighlight();
*/

const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot);
const {infoLabel, infoLabelTail, infoLabelDate, speedMultiplier = 1} = infoLabelTransformer.GetLabelElements();
const duration = BibleVizUtils.Data.tags.StackAnimationsDuration.IncreaseHighlight/speedMultiplier;
const newOpacity = 1;
const easing = {type: "sinusoidal", mode: "inout"};

infoLabelTransformer.StartShakeAnimation();
setTagMask(thisBot, "isHighlightDecreased", false);
setTagMask(thisBot, "strokeColor", "#FFFFFF");
await Promise.allSettled([
    animateTag([infoLabel, infoLabelTail, infoLabelDate], "formOpacity", {
        toValue: newOpacity,
        duration,
        easing
    }),
    animateTag([infoLabel, infoLabelDate], "labelOpacity", {
        toValue: newOpacity,
        duration,
        easing
    })
])

return true;