if(thisBot.masks.highlightHistoryIndex < 0) return false;

const highlight = thisBot.GetHighlightAtCurrentIndex();
let undoSuccessful = false;
if(highlight.data)
{
    if(highlight.data.element && highlight.data.element.tags.isInUse)
    {
        if(!InstanceManager.masks.isInHistoryMode) setTagMask(highlight.data.element, "color", highlight.prevColor ?? highlight.data.element.tags.initialColor);
        undoSuccessful = true;
    }
    highlight.data.highlightColor = highlight.prevColor ?? null;
}
else
{
    if(highlight.element.tags.isInUse)
    {
        let chapterData
        if(highlight.element.masks.chapterOrigin == "map")
        {
            chapterData = MapsManager.GetChapterDataById({id: highlight.element.masks.mapChapterDataId})
        }
        else if(highlight.element.masks.chapterOrigin == "stack")
        {
            chapterData = StacksManager.GetChapterDataById({id: highlight.element.masks.chapterDataId})
        }
        const currentHighlightInfo = chapterData.GetHighlightInfoByKey(highlight.element.masks.chunkPath ?? highlight.element.masks.versePath)
        if(!InstanceManager.masks.isInHistoryMode)
        {
            setTagMask(highlight.element, "color", highlight.prevColor ?? highlight.element.tags.initialColor);
        }
        undoSuccessful = true;
        currentHighlightInfo.color = highlight.prevColor ?? null;
    }
}
thisBot.masks.highlightHistoryIndex--;
if(!undoSuccessful) thisBot.TryUndoHighlight()