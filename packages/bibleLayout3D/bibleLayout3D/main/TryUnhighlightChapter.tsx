const {chapterData} = that;

if (!chapterData.element.masks.isSelecting && 
    !chapterData.element.masks.isDeselecting && 
    !chapterData.element.masks.isBeingDragged)
{
    chapterData.element.Unhighlight({chapterData}).then(() => {
        if(!chapterData.element.masks.isExpanded) InstanceManager.UpdateUsersNotificationOnElements({elementsData: [chapterData]})
    });
}