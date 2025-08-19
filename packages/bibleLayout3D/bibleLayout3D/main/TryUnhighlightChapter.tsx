const {chapterData} = that;

if (!chapterData.element.masks.isSelecting && 
    !chapterData.element.masks.isDeselecting && 
    !chapterData.element.masks.isBeingDragged)
{
    chapterData.element.Unhighlight({chapterData}).then(() => {
        if(!chapterData.element.masks.isExpanded) BibleVizUtils.Functions.UpdateUsersNotificationOnElements({elementsData: [chapterData]})
    });
}