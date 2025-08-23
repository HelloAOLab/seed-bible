animateTag(thisBot, 'scaleX', null)
animateTag(thisBot, 'scaleY', null)
animateTag(thisBot, 'scaleZ', null)
const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot);
if(infoLabelTransformer)
{
    const {infoLabel, infoLabelTail, infoLabelUsersColor} = infoLabelTransformer.GetLabelElements();
    animateTag(infoLabel, 'formOpacity', null);
    animateTag(infoLabel, 'labelOpacity', null);
    animateTag(infoLabelTail, 'formOpacity', null);
    animateTag(infoLabelUsersColor, 'labelOpacity', null);
    animateTag(infoLabelUsersColor, 'formOpacity', null);
}
ColorLerper.StopColorLerp({bot: thisBot,  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color});