console.log(`checkpoint Deactivate`)
if(thisBot.masks.activated)
{
    setTagMask(thisBot, "activated", false);
    animateTag(thisBot, "scale", null);
    LerpColorManager.StopColorLerp({bot: thisBot, tag: InterpolatableColorTags.color});
    setTagMask(thisBot, "scale", 1);
    setTagMask(thisBot, "color", thisBot.tags.offColor);
    setTagMask(thisBot, "strokeColor", thisBot.tags.offColor);
}