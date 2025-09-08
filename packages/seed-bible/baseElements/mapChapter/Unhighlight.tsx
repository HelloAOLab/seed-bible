const {mapChapterData} = that;
const duration = 0.1;
let rgbTargetColor;
let animations = [];
const dimension = os.getCurrentDimension();
const easing = {type: "sinusoidal", mode: "inout"};
thisBot.StopChapterTransition()

if(thisBot.masks.isExpanded)
{
    animations.push(animateTag(thisBot, 'scaleZ', {
        toValue: thisBot.tags.expandedScales.z,
        duration,
        easing
    }))
    rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (mapChapterData.highlightColor ?? thisBot.tags.initialColor));
}
else
{
    let infoLabelTransformer = GetCurrentInfoLabelTransformer(thisBot)
    if(infoLabelTransformer) animations.push(
        infoLabelTransformer.Hide({duration})
            .then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})})
    )
    if(!mapChapterData.isSelected)
    {
        rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (mapChapterData.highlightColor ?? thisBot.tags.initialColor));
    }
}

setTagMask(thisBot, "isUnhighlighting", true);
if(rgbTargetColor) animations.push(LerpColorManager.LerpTagColor({startingColor: HexToRgb(thisBot.masks.color ?? thisBot.tags.color), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: InterpolatableColorTags.Color}))

try
{
    await Promise.all(animations).then(() => {
        setTagMask(thisBot, "isHighlighted", false);
    })
}
catch(error){}
finally
{
    setTagMask(thisBot, "isUnhighlighting", false);
}