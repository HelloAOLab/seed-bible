/**
    * Decreases the highlight effect of the book by reducing the opacity of its label elements.
    * @returns {Promise<boolean>} - Resolves to true once the highlighting effect is decreased.
    * @example
    * book.DecreaseHighlight();
*/

const infoLabelTransformer = GetCurrentInfoLabelTransformer(thisBot);
const duration = 0.15;
const newOpacity = 0.75;
const easing = {type: "sinusoidal", mode: "inout"};
if(infoLabelTransformer)
{
    const {infoLabel, infoLabelTail, infoLabelDate} = infoLabelTransformer.GetLabelElements();
    infoLabelTransformer.StopShakeAnimation();
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
    setTagMask(thisBot, "isHighlightDecreased", true);
    setTagMask(thisBot, "strokeColor", "clear");
    return true;
}
