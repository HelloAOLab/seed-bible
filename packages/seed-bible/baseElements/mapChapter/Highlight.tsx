const mapChapterData = MapsManager.GetMapElementData({element: thisBot});
const duration = 0.1;

let rgbTargetColor;


const animations = [];
const dimension = os.getCurrentDimension();
const easing = {type: "sinusoidal", mode: "inout"};
thisBot.StopChapterTransition()

if(thisBot.masks.isExpanded)
{
    const desiredScaleZ = thisBot.tags.expandedScales.z + 0.1;
    animations.push(animateTag(thisBot, 'scaleZ', {
        toValue: desiredScaleZ,
        duration,
        easing
    }))
    rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (mapChapterData.highlightColor ?? thisBot.tags.highlightedColor));
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
    if(!mapChapterData.isSelected)
    {
        rgbTargetColor = HexToRgb(InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (mapChapterData.highlightColor ?? thisBot.tags.highlightedColor));
    }
}

setTagMask(thisBot, "isHighlighting", true);
if(rgbTargetColor) animations.push(LerpColorManager.LerpTagColor({startingColor: HexToRgb(thisBot.masks.color ?? thisBot.tags.color), endingColor: rgbTargetColor, durationInSeconds: duration, bot: thisBot,  tag: InterpolatableColorTags.Color}))

try
{
    await Promise.all(animations).then(() => {
        setTagMask(thisBot, "isHighlighted", true);
    })
}
catch(error){}
finally
{
    setTagMask(thisBot, "isHighlighting", false);
}