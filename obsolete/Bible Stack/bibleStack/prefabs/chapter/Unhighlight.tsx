/**
    * Unhighlights the chapter by resetting its color and scale, and optionally hiding the info label.
    * @param {Object} that - Context object containing important data for the function.
    * @param {ChapterData} that.chapterData - Data related to the chapter being unhighlighted
    * @example
    * chapter.Unhighlight({ chapterData: someChapterData });
*/

const {chapterData, duration = 0.1} = that;
// const dimension = os.getCurrentDimension();
const rgbTargetColor = BibleVizUtils.Functions.HexToRgb({hexColor: BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: thisBot}) : (chapterData.highlightColor ?? thisBot.tags.initialColor)});
const animations = [];
thisBot.StopChapterTransition();
if(!chapterData.piece.masks.isSelecting && !chapterData.piece.masks.isDeselecting && thisBot.masks.isOnTheGround && chapterData.isSelected)
{
    const easing = {type: "sinusoidal", mode: "inout"};
    animations.push(animateTag(thisBot, 'scaleZ', {
        toValue: thisBot.tags.expandedScales.z,
        duration,
        easing
    }))
}
else
{
    const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot);
    if(infoLabelTransformer) animations.push(infoLabelTransformer.Hide({duration}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}))
}
setTagMask(thisBot, "isUnhighlighting", true);
if(!chapterData.piece.masks.isSelecting && !chapterData.piece.masks.isDeselecting && (!chapterData.isSelected || thisBot.masks.isOnTheGround)) animations.push(ColorLerper.LerpTag({startingColor: BibleVizUtils.Functions.HexToRgb({hexColor: thisBot.masks.color ?? thisBot.tags.color}), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color}))

try
{
    await Promise.all(animations).then(() => {
        setTagMask(thisBot, "isHighlighted", false);
    })
}
catch(error)
{
    void error
}
finally
{
    setTagMask(thisBot, "isUnhighlighting", false);
}

