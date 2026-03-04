const {mapChapterData} = that;

if(mapChapterData.element.masks.isSelecting        || 
    mapChapterData.element.masks.isDeselecting     ||
    mapChapterData.element.masks.isBeingDragged     ||
    (mapChapterData.element.masks.isHighlighted && !mapChapterData.element.masks.isUnhighlighting)) return false;

if(mapChapterData.element.masks.isOnTheGround && !mapChapterData.isSelected) 
{
    InstanceManager.TryHideUsersNotificationOnElement({element: mapChapterData.element})
}
mapChapterData.element.Highlight({mapChapterData});