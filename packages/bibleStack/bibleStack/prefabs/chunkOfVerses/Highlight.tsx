/**
    * Highlights the chunk of verses by animating their color and scaling them.
    * @example
    * chunkOfVerses.Highlight();
*/

const desiredScaleZ = thisBot.tags.desiredScaleZ + 0.1;
const duration = 0.1;
const easing = {type: 'sinusoidal', mode: 'inout'}
const chapterData = thisBot.masks.chapterDataId ? StacksManager.GetChapterDataById({id: thisBot.masks.chapterDataId}) :
                    MapsManager.GetChapterDataById({id: thisBot.masks.mapChapterDataId});
const chunkHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == thisBot.masks.chunkPath})
const rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (chunkHighlightInfo?.color ?? thisBot.tags.highlightedColor));
thisBot.StopHighlightTransition();

await Promise.all([
    LerpColorManager.LerpTagColor({startingColor: HexToRgb(thisBot.masks.color ?? thisBot.tags.color), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: InterpolatableColorTags.Color}),
    animateTag(thisBot, 'scaleZ', {
        toValue: desiredScaleZ,
        duration,
        easing
    })
])