/**
    * Highlights the chapter by animating its color and scale.
    * @returns {Promise<boolean>} - Returns true if the highlight animation is successful.
    * @example
    * const result = chapter.Highlight();
*/

const chapterData = StacksManager.GetBibleElementData({element: thisBot});
const duration = 0.1;
const rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (chapterData.highlightColor ?? thisBot.tags.highlightedColor));
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
        const infoLabelTransformer = GetCurrentInfoLabelTransformer(thisBot) ?? StacksManager.GetLabelForElement({
            element: thisBot, 
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
animations.push(LerpColorManager.LerpTagColor({startingColor: HexToRgb(thisBot.masks.color ?? thisBot.tags.color), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: InterpolatableColorTags.Color}))

try
{
    await Promise.all(animations).then(() => {
        setTagMask(thisBot, "isHighlighted", true);
    })
}
catch()
finally
{
    setTagMask(thisBot, "isHighlighting", false);
}