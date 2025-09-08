/**
    * Unhighlights the chunk of verses by resetting its color and scale.
    * @example
    * chunkOfVerses.Unhighlight();
*/

const duration = 0.1;
const easing = {type: 'sinusoidal', mode: 'inout'}
const chapterData = thisBot.masks.chapterDataId ? StacksManager.GetChapterDataById({id: thisBot.masks.chapterDataId}) :
                    MapsManager.GetChapterDataById({id: thisBot.masks.mapChapterDataId});
let chunkHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == thisBot.masks.chunkPath})
const rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (chunkHighlightInfo?.color ?? thisBot.tags.initialColor));
thisBot.StopHighlightTransition();

await Promise.all([
    LerpColorManager.LerpTagColor({startingColor: HexToRgb(thisBot.masks.color ?? thisBot.tags.color), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: InterpolatableColorTags.Color}),
    animateTag(thisBot, 'scaleZ', {
        toValue: thisBot.tags.desiredScaleZ,
        duration,
        easing
    })
])