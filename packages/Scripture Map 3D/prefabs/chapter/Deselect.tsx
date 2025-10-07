/**
    * Deselects the chapter, animating its appearance and resetting properties.
    * @example
    * chapter.Deselect();
*/

const chapterData = scriptureMap3DManager.GetPieceData({piece: thisBot});
const dimension = os.getCurrentDimension();
const duration = 0.15;
const easing = {type: "sinusoidal", mode: "out"};
const rgbTargetColor = BibleVizUtils.Functions.HexToRgb(BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: thisBot}) : (chapterData.highlightColor ?? thisBot.tags.initialColor));
// const chapterPosition = getBotPosition(thisBot, dimension);
const delayBetweenChunkAnimations = 35;
const chunkAnimationDuration = 0.15;
const chapterScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot);

setTagMask(thisBot, "isDeselecting", true);
if(infoLabelTransformer)
{
    ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})
}

if(Array.isArray(thisBot.vars.chunksOfVerses) && thisBot.vars.chunksOfVerses.length > 0)
{
    await Promise.all(thisBot.vars.chunksOfVerses.toReversed().map((chunk, index) => {
        return chunk.Hide({index, dimension, delayBetweenAnimations: delayBetweenChunkAnimations, duration: chunkAnimationDuration})
    }))
    ObjectPooler.ReleaseObject({obj: thisBot.vars.chunksOfVerses, tag: thisBot.vars.chunksOfVerses[0].tags.poolTag});
    thisBot.vars.chunksOfVerses.splice(0, thisBot.vars.chunksOfVerses.length);
}

await Promise.all([
    ColorLerper.LerpTag({endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color}),
    animateTag(thisBot, 'labelOpacity', {
        toValue: 0,
        duration: duration / 2,
        easing
    }).then(() => {
        setTag(thisBot, "labelFontSize", 0.5);
        setTag(thisBot, 'label', thisBot.tags.chapterNumber);
        return animateTag(thisBot,'labelOpacity', {
            toValue: 1,
            duration: duration / 2,
            easing
        })
    }),
    animateTag(thisBot, {
        fromValue: {
            scaleX: chapterScales.x,
            scaleY: chapterScales.y,
            scaleZ: chapterScales.z
        },
        toValue: {
            scaleX: thisBot.tags.initialScaleX,
            scaleY: thisBot.tags.initialScaleY,
            scaleZ: thisBot.tags.initialScaleZ
        },
        duration,
        easing
    })
]).then(() => {
    setTagMask(thisBot, "isExpanded", false);
    setTagMask(thisBot, "isHighlighted", false);
}).finally(() => {
    setTagMask(thisBot, "isDeselecting", false);
})