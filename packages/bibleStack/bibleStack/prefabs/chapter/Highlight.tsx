/**
    * Highlights the chapter by animating its color and scale.
    * @returns {Promise<boolean>} - Returns true if the highlight animation is successful.
    * @example
    * const result = chapter.Highlight();
*/

const chapterData = BibleStackManager.GetPieceData({piece: thisBot});
const duration = 0.1;
const rgbTargetColor = BibleVizUtils.Functions.HexToRgb({hexColor: BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: thisBot}) : (chapterData.highlightColor ?? thisBot.tags.highlightedColor)});
const animations = [];
thisBot.StopChapterTransition()
if(thisBot.masks.isOnTheGround)
{
    const dimension = os.getCurrentDimension();
    const easing = {type: "sinusoidal", mode: "inout"};
    if(chapterData.isSelected)
    {
        const desiredScaleZ = thisBot.tags.expandedScales.z + 0.1;
        animations.push(animateTag(thisBot, 'scaleZ', {
            toValue: desiredScaleZ,
            duration,
            easing
        }))
    }
    else
    {
        const label = `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber}`
        const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot) ?? BibleVizUtils.Functions.GetLabelForPiece({
            piece: thisBot, 
            label,
            color: 'white', 
            labelColor: 'black', 
            dimension,
            labelPositioning: LabelPositioning.Top,
            isAnimatable: false
        }).infoLabelTransformer;

        animations.push(infoLabelTransformer.Show({duration}))
    }
}

setTagMask(thisBot, "isHighlighting", true);
animations.push(ColorLerper.LerpTag({startingColor: BibleVizUtils.Functions.HexToRgb({hexColor: thisBot.masks.color ?? thisBot.tags.color}), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color}))

try
{
    await Promise.all(animations).then(() => {
        setTagMask(thisBot, "isHighlighted", true);
    })
}
catch(error)
{
    void error
}
finally
{
    setTagMask(thisBot, "isHighlighting", false);
}