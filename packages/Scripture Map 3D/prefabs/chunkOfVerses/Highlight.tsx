/**
    * Highlights the chunk of verses by animating their color and scaling them.
    * @example
    * chunkOfVerses.Highlight();
*/

const desiredScaleZ = thisBot.tags.desiredScaleZ + 0.1;
const duration = 0.1;
const easing = {type: 'sinusoidal', mode: 'inout'}
const chapterData = thisBot.masks.chapterDataId ? BibleStackManager.GetChapterDataById({id: thisBot.masks.chapterDataId}) :
                    scriptureMap3DManager.GetChapterDataById({id: thisBot.masks.chapterDataId});
const chunkHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == thisBot.masks.chunkPath})
const rgbTargetColor = BibleVizUtils.Functions.HexToRgb({hexColor: BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: thisBot}) : (chunkHighlightInfo?.color ?? thisBot.tags.highlightedColor)});
thisBot.StopHighlightTransition();

await Promise.all([
    ColorLerper.LerpTag({startingColor: BibleVizUtils.Functions.HexToRgb({hexColor: thisBot.masks.color ?? thisBot.tags.color}), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color}),
    animateTag(thisBot, 'scaleZ', {
        toValue: desiredScaleZ,
        duration,
        easing
    })
])