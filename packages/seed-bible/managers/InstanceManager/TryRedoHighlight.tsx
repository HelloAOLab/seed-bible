if(thisBot.masks.highlightHistoryIndex >= (thisBot.vars.highlightHistory.length - 1)) return false;

thisBot.masks.highlightHistoryIndex++;
const highlight = thisBot.GetHighlightAtCurrentIndex();
let redoSuccessful = false;
if(highlight.data)
{
    if(highlight.data.element && highlight.data.element.tags.isInUse)
    {
        if(!InstanceManager.masks.isInHistoryMode) setTagMask(highlight.data.element, "color", highlight.color);
        redoSuccessful = true;
    }
    highlight.data.highlightColor = highlight.color;
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
            setTagMask(highlight.element, "color", highlight.color);
        }
        redoSuccessful = true;
        currentHighlightInfo.color = highlight.color;
    }
}
if(!redoSuccessful) thisBot.TryRedoHighlight()