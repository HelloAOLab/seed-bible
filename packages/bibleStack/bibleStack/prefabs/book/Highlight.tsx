/**
    * Highlights the book by scaling and changing its opacity, and displays an info label.
    * @param {Object} [that] - Optional parameter containing additional data.
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed.
    * @example
    * book.Highlight();
*/

import {BookData} from "interactiveBible.managers.StacksManager.BookData"
const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
const bookData = StacksManager.GetBibleElementData({element: thisBot});
const dimension                             = os.getCurrentDimension();
const duration                              = isInstantaneous ? 0 : StackAnimationsDuration.Highlight/speedMultiplier;
const easing                                = {type: "sinusoidal", mode: "inout"};
const bookScales                            = GetBotScales(thisBot);
const scales                                = await thisBot.GetHighlightScales();
const highlightAditionalScale               = 0.1;
const currentDate                           = new Date();
const currentYear                           = currentDate.getFullYear();
const actualInfo                            = (bookData instanceof BookData) ? bookData.elementInfo : bookData.elementBookInfo
const {relativeDateRange}                   = StacksManager.tags.booksStaticInfo[actualInfo.commonName];
const date                                  = InstanceManager.GetCurrentLabelDateFormat() === LabelDateFormats.Relative ? (
    `${Math.abs(relativeDateRange.min)}${(relativeDateRange.min != relativeDateRange.max) ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`
) : (
    `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`
);
const {infoLabelTransformer} = await StacksManager.GetLabelForElement({
    element: thisBot, 
    label: thisBot.tags.bookName,
    date: StacksManager.masks.showBooksLabelDate ? date : null,
    color: 'white', 
    labelColor: thisBot.tags.labelTextColor, 
    dimension,
    labelPositioning: thisBot.masks.isOnTheGround ? LabelPositioning.Top : LabelPositioning.LeftSided,
    isAnimatable: true
});
setTagMask(thisBot, "isHighlighting", true);
setTagMask(thisBot, "isHighlighted", true);
if(bookData.parentDataIds.bibleId)
{
    const activeElementsInStack = getBots(byTag("isStackPiece", true), byTag(dimension, true))
        .map((element) => {return StacksManager.GetBibleElementData({element})})
        .filter((elementData) => {return elementData.parentDataIds.bibleId && elementData.parentDataIds.bibleId === bookData.parentDataIds.bibleId});
    setTagMask(thisBot, "formRenderOrder", (-activeElementsInStack.length - 20));
}
if(bookData instanceof BookData && !bookData.isSelected)
{
    setTagMask(thisBot, "strokeColor", "#FFFFFF");
}

try
{
    await Promise.all([
        animateTag(thisBot, {
            fromValue: {
                formOpacity: thisBot.tags.formOpacity,
                scaleX: bookScales.x,
                scaleY: bookScales.y
            },
            toValue: {
                formOpacity: thisBot.tags.hoveredOpacity,
                scaleX: scales.x + highlightAditionalScale,
                scaleY: scales.y + highlightAditionalScale
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