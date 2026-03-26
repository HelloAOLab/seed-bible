/**
    * Highlights the section by animating its opacity and scale, and shows the associated info label.
    * The speed of the animation can be adjusted with a speed multiplier.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed
    * 
    * @example
    * section.Highlight({speedMultiplier: 1.5})
*/

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
const dimension = os.getCurrentDimension();
const animationDuration = isInstantaneous ? 0 : BibleVizUtils.Data.tags.StackAnimationsDuration.Highlight/speedMultiplier;
const thisBotScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const animationEasing = {type: "sinusoidal", mode: "inout"};
const label = BibleVizUtils.Functions.CapitalizeFirstLetter(thisBot.tags.sectionName.split("-").join(" "));
const sectionData = BibleStackManager.GetPieceData({piece: thisBot})
const {infoLabelTransformer} = BibleVizUtils.Functions.GetLabelForPiece({
    piece: thisBot, 
    label,
    color: "white", 
    labelColor: sectionData.highlightColor ?? thisBot.tags.labelTextColor, 
    dimension,
    labelPositioning: thisBot.masks.isOnTheGround ? BibleVizUtils.Data.tags.LabelPositioning.Top : BibleVizUtils.Data.tags.LabelPositioning.LeftSided,
    isAnimatable: true
});

setTagMask(thisBot, "isHighlighting", true);
setTagMask(thisBot, "isHighlighted", true);

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
                formOpacity: thisBot.tags.hoveredOpacity,
                scaleX: thisBot.tags.hoveredScaleX,
                scaleY: thisBot.tags.hoveredScaleY
            },
            duration: animationDuration,
            easing: animationEasing
        }),
        infoLabelTransformer.Show({manager: BibleStackManager})
    ])
}
catch(error){throw new Error(error)}
finally
{
    setTagMask(thisBot, "isHighlighting", false);
}