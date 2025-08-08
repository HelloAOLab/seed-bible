const {enabled = true} = that;
setTagMask(thisBot, "isHighlightToolEnabled", enabled);
if(enabled)
{
    setTagMask(gridPortalBot, 'portalCursor', BRUSH_CURSOR_URL);
    shout('OnHighlightToolEnabled')
}
else
{
    setTagMask(gridPortalBot, 'portalCursor', 'auto');
    shout('OnHighlightToolDisabled')
}
