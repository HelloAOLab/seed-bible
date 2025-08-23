/**
    * Unhighlights the chunk of verses by resetting its color and scale.
    * @example
    * chunkOfVerses.Unhighlight();
*/

const duration = 0.1;
const easing = {type: 'sinusoidal', mode: 'inout'}
const chapterData = thisBot.masks.chapterDataId ? BibleStackManager.GetChapterDataById({id: thisBot.masks.chapterDataId}) :
                    BibleLayout3DManager.GetChapterDataById({id: thisBot.masks.chapterDataId});
const chunkHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == thisBot.masks.chunkPath})
const rgbTargetColor = BibleVizUtils.Functions.HexToRgb({hexColor: BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: thisBot}) : (chunkHighlightInfo?.color ?? thisBot.tags.initialColor)});
thisBot.StopHighlightTransition();

await Promise.all([
    ColorLerper.LerpTag({startingColor: BibleVizUtils.Functions.HexToRgb({hexColor: thisBot.masks.color ?? thisBot.tags.color}), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color}),
    animateTag(thisBot, 'scaleZ', {
        toValue: thisBot.tags.desiredScaleZ,
        duration,
        easing
    })
])