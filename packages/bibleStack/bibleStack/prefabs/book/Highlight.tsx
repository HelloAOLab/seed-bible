/**
    * Highlights the book by scaling and changing its opacity, and displays an info label.
    * @param {Object} [that] - Optional parameter containing additional data.
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed.
    * @example
    * book.Highlight();
*/

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
const bookData = BibleStackManager.GetPieceData({piece: thisBot});
const dimension = os.getCurrentDimension();
const duration = isInstantaneous ? 0 : BibleVizUtils.Data.tags.StackAnimationsDuration.Highlight/speedMultiplier;
const easing = {type: "sinusoidal", mode: "inout"};
const bookScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const scales = await thisBot.GetHighlightScales();
const highlightAditionalScale = 0.1;
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const actualInfo = (bookData instanceof StackBookData) ? bookData.pieceInfo : bookData.pieceBookInfo
const {relativeDateRange} = BibleVizUtils.Data.tags.booksStaticInfo[actualInfo.commonName];
const date = BibleVizUtils.Functions.GetCurrentLabelDateFormat() === BibleVizUtils.Data.tags.LabelDateFormats.Relative ? (
    `${Math.abs(relativeDateRange.min)}${(relativeDateRange.min != relativeDateRange.max) ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`
) : (
    `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`
);
const {infoLabelTransformer} = BibleVizUtils.Functions.GetLabelForPiece({
    piece: thisBot, 
    label: thisBot.tags.bookName,
    date: BibleStackManager.masks.showBooksLabelDate ? date : null,
    color: 'white', 
    labelColor: thisBot.tags.labelTextColor, 
    dimension,
    labelPositioning: thisBot.masks.isOnTheGround ? BibleVizUtils.Data.tags.LabelPositioning.Top : BibleVizUtils.Data.tags.LabelPositioning.LeftSided,
    isAnimatable: true
});
setTagMask(thisBot, "isHighlighting", true);
setTagMask(thisBot, "isHighlighted", true);
if(bookData.parentDataIds.stackBibleId)
{
    const activeElementsInStack = getBots(byTag("isStackPiece", true), byTag(dimension, true))
        .map((piece) => {return BibleStackManager.GetPieceData({piece})})
        .filter((elementData) => {return elementData.parentDataIds.stackBibleId && elementData.parentDataIds.stackBibleId === bookData.parentDataIds.stackBibleId});
    setTagMask(thisBot, "formRenderOrder", (-activeElementsInStack.length - 20));
}
if(bookData instanceof StackBookData && !bookData.isSelected)
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
catch(error){throw new Error(error)}
finally
{
    setTagMask(thisBot, "isHighlighting", false);
}