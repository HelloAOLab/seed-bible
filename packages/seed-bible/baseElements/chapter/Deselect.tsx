/**
    * Deselects the chapter, animating its appearance and resetting properties.
    * @example
    * chapter.Deselect();
*/

const chapterData = StacksManager.GetBibleElementData({element: thisBot});
const dimension = os.getCurrentDimension();
const duration = 0.15;
const easing = {type: "sinusoidal", mode: "out"};
const rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (chapterData.highlightColor ?? thisBot.tags.initialColor));
const chapterPosition = getBotPosition(chapterData.element, dimension);
const delayBetweenChunkAnimations = 35;
const chunkAnimationDuration = 0.15;

if(chapterData)
{
    setTagMask(thisBot, "isDeselecting", true);

    thisBot.StopChapterTransition()
    
    if(thisBot.masks.isOnTheGround)
    {
        const chapterScales = GetBotScales(thisBot);

        if(Array.isArray(thisBot.vars.chunksOfVerses) && thisBot.vars.chunksOfVerses.length > 0)
        {
            await Promise.all(thisBot.vars.chunksOfVerses.toReversed().map((chunk, index) => {
                return chunk.Hide({index, dimension, delayBetweenAnimations: delayBetweenChunkAnimations, duration: chunkAnimationDuration})
            }))
            thisBot.vars.chunksOfVerses.forEach((chunk) => {ObjectPooler.ReleaseObject({obj: chunk, tag: chunk.tags.poolTag});})
            thisBot.vars.chunksOfVerses.splice(0, thisBot.vars.chunksOfVerses.length);
        }

        await Promise.all([
            LerpColorManager.LerpTagColor({endingColor: rgbTargetColor, durationInSeconds: duration, bot: chapterData.element,  tag: InterpolatableColorTags.Color}),
            animateTag(chapterData.element, 'labelOpacity', {
                toValue: 0,
                duration: duration / 2,
                easing
            }).then(() => {
                setTagMask(chapterData.element, 'labelPosition', 'front');
                setTagMask(chapterData.element, 'label', thisBot.tags.chapterNumber);
                return animateTag(chapterData.element,'labelOpacity', {
                    toValue: 1,
                    duration: duration / 2,
                    easing
                })
            }),
            animateTag(chapterData.element, {
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
    }
    else
    {
        await Promise.all([
            LerpColorManager.LerpTagColor({endingColor: rgbTargetColor, durationInSeconds: duration, bot: chapterData.element,  tag: InterpolatableColorTags.Color}),
            animateTag(chapterData.element, {
                fromValue: {
                    scaleY: chapterData.element.tags.selectedScaleY,
                    [dimension + "Y"]: chapterPosition.y
                },
                toValue: {
                    scaleY: chapterData.element.tags.initialScaleY,
                    [dimension + "Y"]: (chapterPosition.y + (StackElementMeasurements.ChapterFrontSelectedDepth/2))
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
    }

}