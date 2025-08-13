animateTag(thisBot, 'scaleX', null)
animateTag(thisBot, 'scaleY', null)
animateTag(thisBot, 'scaleZ', null)
let infoLabelTransformer = GetCurrentInfoLabelTransformer(thisBot);
if(infoLabelTransformer)
{
    let {infoLabel, infoLabelTail, infoLabelUsersColor} = infoLabelTransformer.GetLabelElements();
    animateTag(infoLabel, 'formOpacity', null);
    animateTag(infoLabel, 'labelOpacity', null);
    animateTag(infoLabelTail, 'formOpacity', null);
    animateTag(infoLabelUsersColor, 'labelOpacity', null);
    animateTag(infoLabelUsersColor, 'formOpacity', null);
}
LerpColorManager.StopColorLerp({bot: thisBot,  tag: InterpolatableColorTags.Color});