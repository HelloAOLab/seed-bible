const {mapChapterData} = that;

if (!mapChapterData.element.masks.isSelecting && 
    !mapChapterData.element.masks.isDeselecting && 
    !mapChapterData.element.masks.isBeingDragged)
{
    mapChapterData.element.Unhighlight({mapChapterData}).then(() => {
        if(!mapChapterData.element.masks.isExpanded) InstanceManager.UpdateUsersNotificationOnElements({elementsData: [mapChapterData]})
    });
}